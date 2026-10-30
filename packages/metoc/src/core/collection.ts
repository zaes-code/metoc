/**
 * # A set of METOC graphics, and how it is saved
 *
 * The engine's store (`SymbolCollection`) with the METOC schema: graphics are saved under
 * `properties.metoc`, names are the catalog's, and only the fields {@link MetocProperties} knows
 * travel. Both renderers draw from one of these and the editor writes to it.
 */

import {SymbolCollection, isPointSize, type CollectionSchema} from '@zaes/symbology-engine';
import {getMetocDisplayName, getMetocSpec, isMetocGraphicName} from './catalog.js';
import {MetocCategory} from './specTypes.js';
import type {MetocProperties} from './types.js';

export type {CollectionChange, CollectionListener, SkippedFeature} from '@zaes/symbology-engine';

/** Copy only the fields the schema knows, so nothing a renderer stamped travels on. */
function cleanProps(raw: MetocProperties): MetocProperties {
    const out: MetocProperties = {name: raw.name};
    if (typeof raw.value === 'string' && raw.value !== '') out.value = raw.value;
    if (typeof raw.color === 'string' && raw.color !== '') out.color = raw.color;
    if (raw.dashed === true) out.dashed = true;
    if (raw.filled === true) out.filled = true;
    if (typeof raw.dtg === 'string' && raw.dtg !== '') out.dtg = raw.dtg;
    if (typeof raw.windDirection === 'number' && isFinite(raw.windDirection)) out.windDirection = ((raw.windDirection % 360) + 360) % 360;
    if (typeof raw.windSpeed === 'number' && isFinite(raw.windSpeed) && raw.windSpeed >= 0) out.windSpeed = raw.windSpeed;
    if (isPointSize(raw.size)) out.size = raw.size;
    if (typeof raw.rotation === 'number' && isFinite(raw.rotation)) {
        // Upright is no rotation at all: absent, never 0.
        const r = ((raw.rotation % 360) + 360) % 360;
        if (r !== 0) out.rotation = r;
    }
    // A station plot's pieces: a symbol of the right kind, or a finite number; anything else is dropped.
    const symbolOf = (v: unknown, ...categories: MetocCategory[]) => (isMetocGraphicName(v) && categories.includes(getMetocSpec(v).category) && getMetocSpec(v).geometry === 'point' ? v : undefined);
    const numberOf = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : undefined);
    const cloud = symbolOf(raw.cloudCover, MetocCategory.CloudCover);
    if (cloud) out.cloudCover = cloud;
    const tendency = symbolOf(raw.pressureTendency, MetocCategory.PressureTendency);
    if (tendency) out.pressureTendency = tendency;
    // Present weather includes thunderstorms, which the catalog files under storms.
    const weather = symbolOf(raw.weather, MetocCategory.Weather, MetocCategory.StormsTropical);
    if (weather) out.weather = weather;
    for (const k of ['temperature', 'dewPoint', 'pressure', 'pressureChange'] as const) {
        const n = numberOf(raw[k]);
        if (n !== undefined) out[k] = n;
    }
    return out;
}

/** What the engine's store needs to know about METOC graphics. */
export const METOC_SCHEMA: CollectionSchema<'metoc', MetocProperties> = {
    key: 'metoc',
    idPrefix: 'metoc',
    label: 'METOC',
    isName: isMetocGraphicName,
    geometryOf: (name) => getMetocSpec(name).geometry,
    displayName: getMetocDisplayName,
    clean: cleanProps,
};

export class MetocCollection extends SymbolCollection<'metoc', MetocProperties> {
    constructor() {
        super(METOC_SCHEMA);
    }
}
