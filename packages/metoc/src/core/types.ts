/**
 * # The saved object
 *
 * A METOC graphic is one GeoJSON feature whose properties carry one object, `properties.metoc`.
 * A point is a `Point`, a line a `LineString`, an area a `Polygon` with one closed ring, as any
 * GeoJSON consumer expects. A wind barb is a `Point` with `windDirection` and `windSpeed`, the
 * form observations arrive in, so a host can plot real winds without drawing anything. Either way the points are the ones the operator drew, in drawing order — and for a line
 * the order is information: Appendix M sets a front's pip side from it ("the sequence of anchor
 * points determines the proper alignment of the line"), so flipping a front reverses its points
 * rather than setting a flag that could disagree with them.
 *
 * Code that edits a graphic works on its *drawn points* — {@link drawnPoints} and
 * {@link withDrawnPoints} — and never on the raw coordinates, so it needs no branch for areas: the
 * ring's closing point is the geometry's business, not the editor's.
 *
 * Nothing about a view travels with a graphic: no zoom, no resolution, no screen size.
 */

import type {LineString, Point, Polygon, Position} from 'geojson';
import {drawnPoints, geometryForKind, type PointSize, type SymbolFeature} from '@zaes/symbology-engine';
import {getMetocSpec, type MetocGraphicName} from './catalog.js';

export {drawnPoints};

export interface MetocProperties {
    name: MetocGraphicName;
    /**
     * The value an isopleth writes at both ends and the middle, or an area writes inside. Free
     * text, as the standard does not fix units. Absent means no label, not an empty one.
     */
    value?: string;
    /**
     * A CSS colour, read only where the standard leaves the colour to the operator. Absent means
     * the standard's colour; a default is never written back.
     */
    color?: string;
    /** The operator-defined freeform line or area drawn dashed. */
    dashed?: boolean;
    /** An area drawn colour-filled with no outer boundary line (Table M-I, Area2). */
    filled?: boolean;
    /**
     * The date-time label, as the operator writes it (a DTG such as `221800ZOCT26`). Shown boxed
     * beside a tropical storm wind area. Absent means no box, never an empty one.
     */
    dtg?: string;
    /**
     * Where the wind blows *from*, in degrees clockwise from true north (a wind barb). Drawn to
     * the nearest 10 degrees, as Table M-I asks. Absent means the direction is missing, and
     * Table M-I says such a wind "is not displayed": only the plot circle is drawn.
     */
    windDirection?: number;
    /**
     * Wind speed in knots (a wind barb). Absent means missing, drawn as an X at the end of the
     * shaft; Table M-I's barbs, half barbs and pennants otherwise.
     */
    windSpeed?: number;
    /**
     * A station plot's sky cover: the name of a cloud coverage symbol (`CloudClearSky` …
     * `CloudSkyObscured`), drawn in the plot circle. Absent means missing: an empty circle.
     */
    cloudCover?: MetocGraphicName;
    /** A station plot's temperature, drawn upper left, in the producer's units (°C or °F). */
    temperature?: number;
    /** A station plot's dew point, drawn lower left, in the same units as the temperature. */
    dewPoint?: number;
    /** A station plot's sea-level pressure in hPa, drawn upper right as the station model's three digits (1013.2 → 132). */
    pressure?: number;
    /** A station plot's pressure tendency: the name of a pressure tendency symbol, drawn right of the circle. */
    pressureTendency?: MetocGraphicName;
    /** A station plot's pressure change over the tendency period in hPa, drawn before the tendency symbol in tenths (1.9 → 19). */
    pressureChange?: number;
    /** A station plot's present weather: the name of a weather or storm symbol, drawn left of the circle. */
    weather?: MetocGraphicName;
    /**
     * How large a point graphic is drawn — small, medium or large — over the configured
     * `pointSize`. Absent means the configured size. Lines and areas ignore it.
     */
    size?: PointSize;
    /**
     * How far a point symbol is turned, in degrees clockwise from upright (0 up to 360). Absent
     * means upright, as the standard draws it. The wind barb ignores it: its wind direction turns
     * it. Lines and areas ignore it.
     */
    rotation?: number;
}

/** One METOC graphic, as saved and exchanged. Coordinates are EPSG:4326 `[lon, lat]`. */
export type MetocFeature = SymbolFeature<'metoc', MetocProperties>;

/** The geometry for drawn points: a point's first point, a line as is, an area as a closed ring. */
export function geometryFor(name: MetocGraphicName, points: readonly Position[]): Point | LineString | Polygon {
    return geometryForKind(getMetocSpec(name).geometry, points);
}

/** The same graphic with new drawn points. */
export function withDrawnPoints(feature: MetocFeature, points: readonly Position[]): MetocFeature {
    return {...feature, geometry: geometryFor(feature.properties.metoc.name, points)};
}

/** Build a graphic from drawn points. */
export function metocFeature(name: MetocGraphicName, points: readonly Position[], extra: Omit<MetocProperties, 'name'> = {}, id?: string): MetocFeature {
    const feature: MetocFeature = {type: 'Feature', geometry: geometryFor(name, points), properties: {metoc: {name, ...extra}}};
    if (id !== undefined) feature.id = id;
    return feature;
}

/**
 * The same graphic with its points reversed: a front's pips move to the other side, an
 * arrowed wind line points the other way. This is how a front is flipped.
 */
export function flipMetocFeature(feature: MetocFeature): MetocFeature {
    return withDrawnPoints(feature, drawnPoints(feature).reverse());
}
