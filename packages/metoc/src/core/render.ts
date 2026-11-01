/**
 * # The public API
 *
 * Two views of one graphic:
 *
 * - {@link renderMetocGraphic} — where it is, as EPSG:4326 GeoJSON: the painted line, label
 *   anchors and edit handles. For any GeoJSON consumer; needs no view.
 * - {@link paintMetocGraphic} — what it looks like at one resolution: every pip, dot and label,
 *   in EPSG:3857 meters. This is what the renderers draw, and {@link paintMetocGraphicAsGeoJSON}
 *   is the same marks as styled GeoJSON for a consumer with no renderer of ours.
 */

import type {Feature, FeatureCollection, LineString, Point, Polygon} from 'geojson';
import {getMetocSpec, isMetocGraphicName, minimumPoints} from './catalog.js';
import {getMetocConfig} from './config.js';
import {catmullRom, catmullRomClosed, fromMercator, type Paint, type PaintContext, paintsToGeoJSON, pointInRing, type ProjectedPosition, type SymbolPainter, toMercator, uprightAngle, walker, pointSizeScale, pointZoomFactor} from '@zaes/symbology-engine';
import {drawnPoints, type MetocFeature, type MetocProperties} from './types.js';
import {dateTimeAnchor, interiorPoint} from '../symbology/areaPaints.js';
import {painterFor} from '../symbology/paints.js';
import {displayedValue, withDisplayedValue} from '../symbology/values.js';

export {paintsToGeoJSON};

/** Points per segment of the curve: 8 showed facets where a long segment bent hard. */
const CURVE_SAMPLES = 16;
/** The smallest a point's value is drawn, in CSS pixels; smaller, it is left out. */
const MIN_POINT_LABEL_PX = 5;

/**
 * The painted line in projected meters: the drawn points, smoothed when the config says so. With
 * `closed`, the points are an area's ring (without its closing point) and the result is closed.
 * The curve passes through every drawn point (Catmull-Rom): Appendix M's "connected with a curved
 * line" is a curve through the anchors. Corner cutting (Chaikin) would leave a front well off
 * the points the operator clicked.
 */
export function paintedPath(projected: readonly ProjectedPosition[], closed = false): ProjectedPosition[] {
    const smooth = getMetocConfig().smoothLines;
    if (closed) {
        if (smooth) return catmullRomClosed(projected, CURVE_SAMPLES);
        const ring = projected.map((p) => [p[0], p[1]] as ProjectedPosition);
        return ring.length ? [...ring, ring[0]] : ring;
    }
    return smooth ? catmullRom(projected, CURVE_SAMPLES) : projected.map((p) => [p[0], p[1]] as ProjectedPosition);
}

/** A graphic's painted outline in projected meters: its line, or its area's closed ring. */
export function paintedOutline(feature: MetocFeature): ProjectedPosition[] {
    const spec = getMetocSpec(feature.properties.metoc.name);
    if (spec.geometry === 'point') return drawnPoints(feature).slice(0, 1).map(toMercator);
    return paintedPath(drawnPoints(feature).map(toMercator), spec.geometry === 'area');
}

/**
 * The marks for drawn points given in projected meters: a line's points, or an area's ring
 * without its closing point. The building block under {@link paintMetocGraphic}, for a caller
 * that is not on a map, such as a thumbnail.
 */
export function paintMetocPath(props: MetocProperties, projected: readonly ProjectedPosition[], context: PaintContext): Paint[] {
    if (!isMetocGraphicName(props.name) || !(context.resolution > 0)) return [];
    const spec = getMetocSpec(props.name);
    if (projected.length < minimumPoints(spec)) return [];
    // A point has no path: its painter reads the anchor, walker.path[0], and draws around it.
    const w = spec.geometry === 'point' ? walker(projected.slice(0, 1)) : walker(paintedPath(projected, spec.geometry === 'area'));
    if (w.length === 0 && spec.geometry !== 'point') return [];
    const painter = painterFor(spec);
    if (!painter) return [];
    // A point graphic's size: its geometry is screen-sized (CSS pixels × resolution), so painting at
    // a scaled resolution scales the shapes about the anchor; text sizes and stroke widths are pixels
    // a resolution does not touch, so they are scaled after.
    const scale = spec.geometry === 'point' ? metocPointScale(props, context.resolution) : 1;
    let paints = painter({spec, props: withDisplayedValue(spec, props), walker: w, resolution: context.resolution * scale});
    if (scale !== 1) paints = paints.map((p) => scalePixels(p, scale));
    // A point's value shrinks with it, and is dropped once too small to read, as an area's label is
    // (below the smallest size a small symbol writes it at full size).
    if (spec.geometry === 'point') paints = paints.filter((p) => !p.text || p.text.symbol || p.text.sizePx >= MIN_POINT_LABEL_PX);
    // A turned point symbol, turned about its anchor. A directional one points by its own data.
    const turn = spec.geometry === 'point' && !spec.directional ? (props.rotation ?? 0) : 0;
    if (turn) {
        const rings = closedRings(paints);
        paints = paints.map((p) => rotated(p, projected[0], turn, !!p.text && (!!p.text.symbol || rings.some((r) => pointInRing(p.geometry.coordinates as ProjectedPosition, r)))));
    }
    return withLabelStyle(paints);
}

/** The closed outlines among a symbol's marks: its filled shapes' rings, and strokes that close on themselves (a box). */
function closedRings(paints: readonly Paint[]): ProjectedPosition[][] {
    const out: ProjectedPosition[][] = [];
    for (const p of paints) {
        if (p.text) continue;
        if (p.geometry.type === 'Polygon') out.push(p.geometry.coordinates[0]);
        else if (p.geometry.type === 'LineString') {
            const c = p.geometry.coordinates;
            if (c.length >= 4 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) out.push(c);
        }
    }
    return out;
}

/**
 * A mark turned `degrees` clockwise about `o`. Text that is part of the picture turns with it — a
 * symbol's own text (an H), and a value written inside the symbol's own outline (a box, an
 * ellipse), which reads as part of it. A label beside the symbol moves with it but keeps reading
 * the way it did, so it stays legible.
 */
function rotated(p: Paint, o: ProjectedPosition, degrees: number, turnText: boolean): Paint {
    const a = (degrees * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    // Clockwise on the map, whose y runs north.
    const turn = (c: readonly number[]): ProjectedPosition => [o[0] + (c[0] - o[0]) * cos + (c[1] - o[1]) * sin, o[1] - (c[0] - o[0]) * sin + (c[1] - o[1]) * cos];
    const g = p.geometry;
    const geometry =
        g.type === 'Point' ? {type: g.type, coordinates: turn(g.coordinates)} : g.type === 'LineString' ? {type: g.type, coordinates: g.coordinates.map(turn)} : {type: g.type, coordinates: g.coordinates.map((r) => r.map(turn))};
    return {...p, geometry, ...(p.text && turnText ? {text: {...p.text, rotation: p.text.rotation - a}} : {})} as Paint;
}

/**
 * The configured label style on every text mark: the font and halo on all of them, and on labels
 * (not a symbol's own text) the label colour, or nothing at all when labels are off.
 */
function withLabelStyle(paints: Paint[]): Paint[] {
    const cfg = getMetocConfig();
    const halo = cfg.labelHaloWidth === 3 ? undefined : cfg.labelHaloWidth;
    if (cfg.showLabels && !cfg.labelColor && !cfg.labelFont && halo === undefined) return paints;
    const out: Paint[] = [];
    for (const p of paints) {
        if (!p.text) {
            out.push(p);
            continue;
        }
        const label = !p.text.symbol;
        if (label && !cfg.showLabels) continue;
        out.push({
            ...p,
            text: {
                ...p.text,
                ...(label && cfg.labelColor ? {color: cfg.labelColor} : {}),
                ...(cfg.labelFont ? {fontFamily: cfg.labelFont} : {}),
                ...(halo !== undefined ? {haloPx: halo} : {}),
            },
        });
    }
    return out;
}

/** A mark with its pixel sizes (text, stroke width, dashes) times `s`. */
function scalePixels(p: Paint, s: number): Paint {
    return {
        ...p,
        ...(p.stroke ? {stroke: {...p.stroke, widthPx: p.stroke.widthPx * s, ...(p.stroke.dashPx ? {dashPx: p.stroke.dashPx.map((d) => d * s)} : {})}} : {}),
        ...(p.text ? {text: {...p.text, sizePx: p.text.sizePx * s}} : {}),
    };
}

/**
 * How much larger than its standard size a point graphic is drawn: its `size`, or the configured
 * `pointSize`; at a `resolution`, also shrunk as the map zooms out past `pointFullSizeScale`.
 */
export function metocPointScale(props: MetocProperties, resolution?: number): number {
    const size = pointSizeScale(props.size, getMetocConfig().pointSize);
    return resolution === undefined ? size : size * metocPointZoomFactor(resolution);
}

/** How much the configuration shrinks point symbols at a resolution, as the map zooms out (1: not at all). */
export function metocPointZoomFactor(resolution: number): number {
    const cfg = getMetocConfig();
    return pointZoomFactor(resolution, cfg.pointFullSizeScale, cfg.pointMinScale);
}

/** What a graphic looks like at one resolution, in EPSG:3857 meters. */
export function paintMetocGraphic(feature: MetocFeature, context: PaintContext): Paint[] {
    const props = feature.properties?.metoc;
    if (!props) return [];
    return paintMetocPath(props, drawnPoints(feature).map(toMercator), context);
}

/** METOC as the engine's renderers see it: the marks, and the outline they cull and pick by. */
export const METOC_PAINTER: SymbolPainter<MetocFeature> = {paint: paintMetocGraphic, outline: paintedOutline};

export type MetocRole = 'graphic' | 'label' | 'handle';

export interface RenderedMetocGraphic {
    /** The point, or the line or area as painted (smoothed), without its screen-sized decoration. */
    graphic: Feature<Point | LineString | Polygon>;
    /** Where the value labels go, for isopleths with a value. `text` and `rotation` (degrees, clockwise) are on each. */
    labels: Feature<Point>[];
    /** The drawn points, in order. Editing moves these; the painted line follows. */
    handles: Feature<Point>[];
}

/**
 * Where a graphic is, as EPSG:4326 GeoJSON, with `properties.metoc` and a `role` stamped on every
 * output feature. Decorations are screen-sized and so not here; ask {@link paintMetocGraphicAsGeoJSON}.
 */
export function renderMetocGraphic(feature: MetocFeature): RenderedMetocGraphic {
    const metoc = feature.properties.metoc;
    const drawn = drawnPoints(feature);
    const spec = getMetocSpec(metoc.name);
    const path = paintedOutline(feature);
    const props = (role: MetocRole, extra: Record<string, unknown> = {}) => ({metoc, role, ...extra});

    const labels: Feature<Point>[] = [];
    const value = displayedValue(spec, metoc.value)?.trim();
    if (value && spec.valueField && spec.geometry === 'line' && path.length >= 2) {
        const w = walker(path);
        for (const d of [0, w.length / 2, w.length]) {
            const {point, dir} = w.at(d);
            labels.push({
                type: 'Feature',
                geometry: {type: 'Point', coordinates: fromMercator(point)},
                properties: props('label', {text: value, rotation: (-uprightAngle(dir) * 180) / Math.PI}),
            });
        }
    }

    if (spec.geometry === 'point' && value && spec.valueField) {
        labels.push({type: 'Feature', geometry: {type: 'Point', coordinates: fromMercator(path[0])}, properties: props('label', {text: value, rotation: 0})});
    }

    if (spec.geometry === 'area' && path.length >= 4) {
        // Where an area's labels go, as the painter places them, minus the screen-sized offsets a
        // view would add: the freeform value at a point well inside, the wind radius at the top
        // of the outline, the date-time at the outline's upper-left edge.
        const label = (at: ProjectedPosition, text: string, extra: Record<string, unknown> = {}) =>
            labels.push({type: 'Feature', geometry: {type: 'Point', coordinates: fromMercator(at)}, properties: props('label', {text, rotation: 0, ...extra})});
        if (value && spec.valueField) {
            const top = path.reduce((a, b) => (b[1] > a[1] ? b : a));
            label(spec.dateTimeLabel ? top : interiorPoint(path), value);
        }
        const dtg = metoc.dtg?.trim();
        if (dtg && spec.dateTimeLabel) label(dateTimeAnchor(path), dtg, {boxed: true});
    }

    return {
        graphic: {
            type: 'Feature',
            id: feature.id,
            geometry:
                spec.geometry === 'area'
                    ? {type: 'Polygon', coordinates: [path.map(fromMercator)]}
                    : spec.geometry === 'point'
                      ? {type: 'Point', coordinates: fromMercator(path[0])}
                      : {type: 'LineString', coordinates: path.map(fromMercator)},
            properties: props('graphic'),
        },
        labels,
        handles: drawn.map((c, index) => ({type: 'Feature', geometry: {type: 'Point', coordinates: [c[0], c[1]]}, properties: props('handle', {index})})),
    };
}

/** {@link renderMetocGraphic}'s three parts as one collection. */
export function toFeatureCollection(rendered: RenderedMetocGraphic): FeatureCollection {
    return {type: 'FeatureCollection', features: [rendered.graphic, ...rendered.labels, ...rendered.handles]};
}

/** What a graphic looks like at one resolution, as styled EPSG:4326 GeoJSON. */
export function paintMetocGraphicAsGeoJSON(feature: MetocFeature, context: PaintContext): FeatureCollection {
    return paintsToGeoJSON(paintMetocGraphic(feature, context));
}
