/**
 * # The METOC catalog
 *
 * Every graphic of MIL-STD-2525E Change 1, Appendix M — symbol set 45 (Atmospheric) and 46
 * (Oceanographic) — with the facts the standard gives about it: its entity code (Table A-LI /
 * A-LII), its colour and its draw rule (Appendix M, Tables M-II and M-III), and, for the ones drawn
 * from data, its icon or style. This is the one statement of those facts: the paint layer, the
 * SIDC helpers and the editor's field list all read it.
 *
 * The entries live in the `catalog` folder; the set of graphic names is *derived* from them, so a
 * new entry is a new name with nothing else to keep in step.
 *
 * Appendix M: "Standard Identity is not applicable to METOC symbols", so nothing here carries a
 * hostility. Colours are fixed by the standard, except where it says "Operator Defined" or offers a
 * choice ("Red or Black"), which is what {@link MetocGraphicSpec.operatorColor} marks.
 */

import {CORE_SPECS} from '../catalog/core.js';
import {SET45_POINT_SPECS} from '../catalog/set45Points.js';
import {SET46_POINT_SPECS} from '../catalog/set46Points.js';
import {SET46_LINE_AREA_SPECS} from '../catalog/set46LinesAreas.js';
import type {MetocSpecDef} from './specTypes.js';

export {MetocCategory, metocSpec} from './specTypes.js';
export type {
    AreaStyleDef,
    GlyphColor,
    GlyphDef,
    GlyphPart,
    LineDecoration,
    LineStyleDef,
    MetocColor,
    MetocColorRole,
    MetocDrawRule,
    MetocGeometryKind,
    MetocValueField,
} from './specTypes.js';

const ALL_SPECS = [...CORE_SPECS, ...SET45_POINT_SPECS, ...SET46_POINT_SPECS, ...SET46_LINE_AREA_SPECS] as const;

/** The name of every METOC graphic this library draws. */
export type MetocGraphicName = (typeof ALL_SPECS)[number]['name'];

/** Every name as a value, for `MetocGraphicName.ColdFront`-style access. */
export const MetocGraphicName = Object.freeze(Object.fromEntries(ALL_SPECS.map((s) => [s.name, s.name]))) as {readonly [K in MetocGraphicName]: K};

/** What the standard says about one graphic. */
export type MetocGraphicSpec = MetocSpecDef<MetocGraphicName>;

/** The catalog, keyed by name, in the standard's order. */
export const METOC_GRAPHICS = Object.freeze(Object.fromEntries(ALL_SPECS.map((s) => [s.name, s]))) as Readonly<Record<MetocGraphicName, MetocGraphicSpec>>;

/** The fewest points a saved graphic has: one for a point, two for a line, three for an area (Table M-I). */
export function minimumPoints(spec: MetocGraphicSpec): number {
    return spec.geometry === 'area' ? 3 : spec.geometry === 'line' ? 2 : 1;
}

/**
 * How many clicks draw a point graphic: one, or two for a directional one (the anchor, then the
 * direction). A point finishes by itself on its last click; lines and areas have no fixed count.
 */
export function pointClicks(spec: MetocGraphicSpec): number | undefined {
    return spec.geometry === 'point' ? (spec.directional ? 2 : 1) : undefined;
}

/** Every graphic name, in catalog order. */
export function listMetocGraphics(): MetocGraphicName[] {
    return ALL_SPECS.map((s) => s.name);
}

/** True when `name` is a graphic this library knows. Use it on anything read from a file. */
export function isMetocGraphicName(name: unknown): name is MetocGraphicName {
    return typeof name === 'string' && Object.prototype.hasOwnProperty.call(METOC_GRAPHICS, name);
}

/** The standard's facts about one graphic. */
export function getMetocSpec(name: MetocGraphicName): MetocGraphicSpec {
    return METOC_GRAPHICS[name];
}

/** The user-facing name. Never show an enum key in a UI. */
export function getMetocDisplayName(name: MetocGraphicName): string {
    return METOC_GRAPHICS[name].displayName;
}

/**
 * Find a graphic by its six-digit entity code. The symbol set is needed: sets 45 and 46 reuse
 * codes (110101 is a cyclone centre in one and many icebergs in the other).
 */
export function metocGraphicByEntityCode(entityCode: string, symbolSet: 45 | 46 = 45): MetocGraphicName | undefined {
    return ALL_SPECS.find((s) => s.symbolSet === symbolSet && s.entityCode === entityCode)?.name;
}
