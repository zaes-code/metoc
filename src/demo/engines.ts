/**
 * The map engines the sample offers (OpenLayers, MapLibre flat and in 3D on terrain, and any add-on engine), behind one small handle so the page can switch between
 * them without caring which is up. Not published.
 *
 * Both use the OpenStreetMap standard tiles. The OSM Tile Usage Policy permits modest use and
 * requires the attribution to stay visible: never remove or hide the attribution control.
 */

import OlMap from 'ol/Map.js';
import View from 'ol/View.js';
import {defaults as defaultControls} from 'ol/control/defaults.js';
import TileLayer from 'ol/layer/Tile.js';
import {fromLonLat, toLonLat} from 'ol/proj.js';
import OSM from 'ol/source/OSM.js';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'ol/ol.css';
import type {MetocCollection, MetocMapHost, ViewAdapter} from '@zaes/metoc';
import {MetocOpenLayers} from '@zaes/metoc/openlayers';
import {MetocMapLibre} from '@zaes/metoc/maplibre';
import type {DemoAddonEngine} from './addonTypes';

/** The page's own engines, or an add-on engine's id. */
export type EngineName = 'openlayers' | 'maplibre' | 'maplibre3d' | (string & {});

/** Where the map is looking, in MapLibre zoom (512-pixel tiles). */
export interface ViewState {
    center: [number, number];
    zoom: number;
}

/**
 * The map controls' camera: zoom on every engine; on a 3D one,
 * tilt and north as well.
 */
export interface EngineCamera {
    zoomIn(): void;
    zoomOut(): void;
    /** Tilt by `degrees` (up is more oblique, toward the horizon). 3D engines only. */
    tilt?(degrees: number): void;
    /** Turn back to north up. 3D engines only. */
    resetNorth?(): void;
    /** The view's heading in degrees, clockwise from north. */
    bearing?(): number;
    /** How far the view is tilted, in degrees from looking straight down. 3D engines only. */
    pitch?(): number;
    /** Stand point symbols on leader lines, or lay them on the ground (the Settings switch). 3D engines only. */
    setLeaderLines?(on: boolean): void;
}

export interface EngineHandle {
    readonly name: EngineName;
    readonly camera: EngineCamera;
    readonly view: ViewAdapter;
    /** The renderer, as the seam the editor attaches to. */
    readonly host: MetocMapHost;
    viewState(): ViewState;
    /** CSS-pixel size of the map viewport. */
    size(): [number, number];
    setBasemapOpacity(opacity: number): void;
    /** Darken the basemap (the page's dark mode), or restore it. */
    setDarkBasemap(dark: boolean): void;
    refresh(): void;
    dispose(): void;
}

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function createEngine(
    name: EngineName,
    target: HTMLElement,
    collection: MetocCollection,
    state: ViewState,
    basemapOpacity: number,
    dark: boolean,
    leaderLines: boolean,
    addons: readonly DemoAddonEngine[] = [],
): Promise<EngineHandle> {
    if (name === 'openlayers') return Promise.resolve(openLayersEngine(target, collection, state, basemapOpacity));
    if (name === 'maplibre' || name === 'maplibre3d') return Promise.resolve(mapLibreEngine(target, collection, state, basemapOpacity, dark, name === 'maplibre3d' && leaderLines, name === 'maplibre3d'));
    const addon = addons.find((e) => e.id === name);
    if (!addon) return Promise.reject(new Error(`${name} is not an engine on this page`));
    return addon.create(target, collection, state, basemapOpacity, dark, leaderLines);
}

/**
 * MapLibre's dark basemap. A CSS filter cannot be used: MapLibre draws every layer into one
 * canvas, so it would invert the symbols too. Raster paint properties apply to the tile layer
 * alone; brightness-min above brightness-max inverts the ramp, standing in for CSS invert().
 * Values chosen to read like the OpenLayers filter in demo.css. Light states every property, so
 * switching back resets each one.
 */
const RASTER_PAINT = {
    dark: {'raster-brightness-min': 1, 'raster-brightness-max': 0, 'raster-hue-rotate': 180, 'raster-saturation': -0.2, 'raster-contrast': -0.1},
    light: {'raster-brightness-min': 0, 'raster-brightness-max': 1, 'raster-hue-rotate': 0, 'raster-saturation': 0, 'raster-contrast': 0},
} as const;

function openLayersEngine(target: HTMLElement, collection: MetocCollection, state: ViewState, opacity: number): EngineHandle {
    // The className is what demo.css's dark filter targets, and what keeps that filter off the symbols.
    const basemap = new TileLayer({source: new OSM(), opacity, className: 'metoc-basemap'});
    // OpenLayers' zoom counts 256-pixel tiles, one level above MapLibre's 512-pixel ones.
    const map = new OlMap({
        target,
        layers: [basemap],
        // The page's own controls zoom (top right); the attribution stays, as OSM requires.
        controls: defaultControls({zoom: false, rotate: false, attributionOptions: {collapsible: false}}),
        view: new View({center: fromLonLat(state.center), zoom: state.zoom + 1}),
    });
    const renderer = new MetocOpenLayers(map, collection);
    return {
        name: 'openlayers',
        camera: {
            zoomIn: () => map.getView().animate({zoom: (map.getView().getZoom() ?? 3) + 1, duration: 250}),
            zoomOut: () => map.getView().animate({zoom: (map.getView().getZoom() ?? 3) - 1, duration: 250}),
        },
        view: renderer.view,
        host: renderer,
        viewState: () => {
            const v = map.getView();
            const c = toLonLat(v.getCenter() ?? [0, 0]);
            return {center: [c[0], c[1]], zoom: (v.getZoom() ?? 3) - 1};
        },
        size: () => {
            const s = map.getSize() ?? [target.clientWidth, target.clientHeight];
            return [s[0], s[1]];
        },
        setBasemapOpacity: (o) => basemap.setOpacity(o),
        // demo.css does it, from the page's data-theme.
        setDarkBasemap: () => undefined,
        refresh: () => renderer.refresh(),
        dispose: () => {
            renderer.dispose();
            map.setTarget(undefined);
        },
    };
}

function mapLibreEngine(
    target: HTMLElement,
    collection: MetocCollection,
    state: ViewState,
    opacity: number,
    dark: boolean,
    leaderLines: boolean,
    tilted: boolean,
): EngineHandle {
    // MapLibre locates its worker from import.meta.url, which Vite's pre-bundling breaks; serve
    // the copy scripts/copy-maplibre-worker.mjs puts in public/.
    maplibregl.setWorkerUrl(`${import.meta.env.BASE_URL}maplibre-gl-worker.mjs`);
    const map = new maplibregl.Map({
        container: target,
        center: state.center,
        zoom: state.zoom,
        attributionControl: {compact: false},
        style: {
            version: 8,
            sources: {
                osm: {type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: OSM_ATTRIBUTION},
            },
            layers: [{id: 'osm', type: 'raster', source: 'osm', paint: {'raster-opacity': opacity, ...RASTER_PAINT[dark ? 'dark' : 'light']}}],
        },
    });
    // In 3D, the terrain and the sky; each point symbol on a leader line, clear of the ground, unless Settings says not.
    if (tilted) {
        map.setMaxPitch(TILT.maxPitch);
        const enter = () => {
            addTerrain(map, dark);
            map.on('zoomend', () => fitTerrain(map));
            map.easeTo({pitch: TILT.startPitch, bearing: TILT.startBearing, duration: 1200});
        };
        // 'load', not 'style.load': an inline style is set up inside the constructor, before a
        // listener could hear it, and isStyleLoaded() stays false while its tiles load.
        map.once('load', enter);
    }
    const renderer = new MetocMapLibre(map, collection, {pointLeaders: leaderLines});
    return {
        name: tilted ? 'maplibre3d' : 'maplibre',
        camera: {
            zoomIn: () => map.zoomIn({duration: 250}),
            zoomOut: () => map.zoomOut({duration: 250}),
            ...(tilted
                ? {
                      tilt: (d: number) => map.easeTo({pitch: Math.min(TILT.maxPitch, Math.max(0, map.getPitch() + d)), duration: 300}),
                      resetNorth: () => map.easeTo({bearing: 0, duration: 500}),
                      bearing: () => map.getBearing(),
                      pitch: () => map.getPitch(),
                      setLeaderLines: (on: boolean) => renderer.setLeaderLines(on),
                  }
                : {}),
        },
        view: renderer.view,
        host: renderer,
        viewState: () => {
            const c = map.getCenter();
            return {center: [c.lng, c.lat], zoom: map.getZoom()};
        },
        size: () => [map.getContainer().clientWidth, map.getContainer().clientHeight],
        setBasemapOpacity: (o) => {
            if (map.getLayer('osm')) map.setPaintProperty('osm', 'raster-opacity', o);
        },
        setDarkBasemap: (d) => {
            if (!map.getLayer('osm')) return;
            for (const [k, v] of Object.entries(RASTER_PAINT[d ? 'dark' : 'light'])) map.setPaintProperty('osm', k as 'raster-contrast', v);
            if (tilted) paintTerrain(map, d);
        },
        refresh: () => renderer.refresh(),
        dispose: () => {
            renderer.dispose();
            map.remove();
        },
    };
}

/**
 * MapLibre in 3D: Terrarium terrain (keyless, AWS Open
 * Data) at 1.5×, a hillshade under the graphics, a sky; opened at 60° pitch.
 */
const TILT = {maxPitch: 80, startPitch: 60, startBearing: -20, exaggeration: 1.5, terrainMinZoom: 8} as const;
const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const TERRAIN_ATTRIBUTION = 'Terrain Tiles: Mapzen, <a href="https://registry.opendata.aws/terrain-tiles/">AWS Open Data</a>';

const SKY = {
    dark: {'sky-color': '#0b1522', 'horizon-color': '#1d2f45', 'fog-color': '#1a1f27', 'sky-horizon-blend': 0.6},
    light: {'sky-color': '#7fb6e8', 'horizon-color': '#dcecf8', 'fog-color': '#eef3f7', 'sky-horizon-blend': 0.5},
} as const;
const HILLSHADE = {
    dark: {'hillshade-exaggeration': 0.45, 'hillshade-shadow-color': '#000000', 'hillshade-highlight-color': '#5a6b7d', 'hillshade-accent-color': '#10161d'},
    light: {'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#3d4a57', 'hillshade-highlight-color': '#ffffff', 'hillshade-accent-color': '#5d6b78'},
} as const;

function addTerrain(map: maplibregl.Map, dark: boolean): void {
    // Two sources over the same tiles, as MapLibre advises: one shared steps the shading at tile seams.
    const dem = (attribution?: string): maplibregl.RasterDEMSourceSpecification => ({
        type: 'raster-dem',
        tiles: [TERRAIN_TILES],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15,
        // Absent, not undefined: MapLibre's validation refuses an undefined attribution.
        ...(attribution ? {attribution} : {}),
    });
    if (!map.getSource('terrain')) map.addSource('terrain', dem(TERRAIN_ATTRIBUTION));
    if (!map.getSource('hillshade')) map.addSource('hillshade', dem());
    // Just above the basemap, under every graphic.
    const above = map.getStyle().layers.find((_, i, all) => all[i - 1]?.id === 'osm')?.id;
    if (!map.getLayer('hillshade')) map.addLayer({id: 'hillshade', type: 'hillshade', source: 'hillshade'}, above);
    fitTerrain(map);
    paintTerrain(map, dark);
}

/**
 * Terrain only from TILT.terrainMinZoom in. Out at region and continent scale, Terrarium's sea floor
 * (kilometres deep) made the tile edges show as pale boxes and streaks over the ocean, on a real
 * GPU too, and the relief there is too small to see; the hillshade stays.
 */
function fitTerrain(map: maplibregl.Map): void {
    const want = map.getZoom() >= TILT.terrainMinZoom;
    if (want === !!map.getTerrain()) return;
    map.setTerrain(want ? {source: 'terrain', exaggeration: TILT.exaggeration} : null);
}

function paintTerrain(map: maplibregl.Map, dark: boolean): void {
    const k = dark ? 'dark' : 'light';
    map.setSky({...SKY[k], 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.7, 'atmosphere-blend': 0.6});
    if (map.getLayer('hillshade')) for (const [p, v] of Object.entries(HILLSHADE[k])) map.setPaintProperty('hillshade', p as 'hillshade-exaggeration', v as never);
}
