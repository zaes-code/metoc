/**
 * # Which fields a graphic offers
 *
 * The properties dialog asks this, per graphic, which inputs to show — the dialog holds no rule of
 * its own, so every host's dialog offers the same fields.
 *
 * Most of a field set is the standard's facts, read from the catalog so they are stated once.
 * What the catalog cannot say is what to *call* the value on each graphic — an isotherm's value is
 * a temperature, a wind area's is a wind speed — so that one part is an exhaustive record here,
 * and a test holds it to the catalog: a graphic has a value field exactly when the standard gives
 * it a value.
 */
import {getMetocSpec, listMetocGraphics, type MetocColorRole, type MetocGraphicName as N, type MetocValueField} from '../index.js';


export type {MetocValueField};

export interface MetocFieldSet {
    /** The value written on the graphic, or `null` where the graphic carries none. */
    value: MetocValueField | null;
    /** The boxed date-time label. */
    dtg: boolean;
    /** Any colour (`'any'`), a choice among roles, or none: the standard fixes it. */
    color: 'any' | readonly MetocColorRole[] | null;
    /** Solid or dashed. */
    dashed: boolean;
    /** Colour-filled with no boundary (Area2 only). */
    filled: boolean;
    /** Small, medium or large: point graphics only. */
    size: boolean;
    /** Wind direction (degrees, from) and speed (knots): the wind barb and the station plot. */
    wind: boolean;
    /**
     * A station plot's observation: sky cover, temperature, dew point, pressure, pressure change and
     * tendency, present weather. The symbols to choose from are {@link stationChoices}.
     */
    station: boolean;
}

/**
 * The symbols a station plot's pickers offer, in catalog order: the cloud coverage symbols for its
 * sky cover, the pressure tendency symbols, and the weather symbols for its present weather.
 */
export function stationChoices(): {cloudCover: N[]; pressureTendency: N[]; weather: N[]} {
    const of = (...categories: string[]) => listMetocGraphics().filter((n) => categories.includes(getMetocSpec(n).category) && getMetocSpec(n).geometry === 'point');
    // Present weather includes thunderstorms and the like, which the catalog files under storms.
    return {cloudCover: of('Cloud cover'), pressureTendency: of('Pressure tendency'), weather: of('Weather', 'Storms and tropical systems')};
}

/** The value field's wording, per graphic, as the catalog states it. */
export const METOC_VALUE_FIELDS: Readonly<Partial<Record<N, MetocValueField>>> = Object.freeze(
    Object.fromEntries(listMetocGraphics().flatMap((n) => (getMetocSpec(n).valueField ? [[n, getMetocSpec(n).valueField]] : []))),
);

/** The inputs a properties dialog shows for a graphic. */
export function getMetocFields(name: N): MetocFieldSet {
    const s = getMetocSpec(name);
    return {
        value: METOC_VALUE_FIELDS[name] ?? null,
        dtg: s.dateTimeLabel === true,
        color: s.operatorColor === true ? 'any' : (s.operatorColor ?? null),
        dashed: s.operatorDash === true,
        filled: s.drawRule === 'Area2',
        size: s.geometry === 'point',
        wind: s.directional === true,
        station: name === 'StationPlot',
    };
}

/** What to call a colour role in a UI. */
export const METOC_COLOR_ROLE_NAMES: Readonly<Record<MetocColorRole, string>> = {
    cold: 'Blue',
    warm: 'Red',
    occluded: 'Purple',
    black: 'Black',
    convergence: 'Orange',
    discontinuityGreen: 'Green',
    isotach: 'Purple',
    isodrosotherm: 'Green',
    green: 'Green',
    brown: 'Brown',
    yellow: 'Yellow',
    gray: 'Gray',
    magenta: 'Magenta',
    icingBrown: 'Brown',
    white: 'White',
};
