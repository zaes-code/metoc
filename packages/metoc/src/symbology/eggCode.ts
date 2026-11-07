/**
 * # The WMO egg code
 *
 * An ice chart writes what a sea-ice area holds in an oval, the "egg", inside it: total
 * concentration on top, then the partial concentrations, the stages of development and the forms
 * of ice of the thickest, second and third thickest ice, each row under a line across the oval.
 * Concentrations are in tenths; stages and forms are the WMO code figures (a dot after a stage
 * figure marks the thicker stages, ▲ glacier ice or icebergs, X undetermined).
 *
 * The egg is read from the S-411 attributes a graphic carries (`properties.metoc.s100`), so an ice
 * area drawn by hand has none; it is drawn where it fits inside the area, shrinking to three
 * quarters of its size, and left out below that.
 */

import {labelAnchorInRing, type Paint} from '@zaes/symbology-engine';
import {getMetocConfig} from '../core/config.js';
import type {GlyphDef, GlyphPart} from '../core/specTypes.js';
import {paintGlyph} from './glyph.js';
import type {Painter} from './paints.js';
import {areaStylePainter} from './stylePaints.js';

/** What an egg says, as it is written: each row's figures, blank where the data gives none. */
export interface EggCode {
    /** Total concentration (Ct). */
    total: string;
    /** Partial concentrations (Ca Cb Cc); empty when only one stage is reported. */
    partial: string[];
    /** Stages of development (Sa Sb Sc). */
    stages: string[];
    /** Forms of ice (Fa Fb Fc). */
    forms: string[];
}

/** Every code an attribute holds: a number, or several joined with commas. */
function codesOf(v: string | number | undefined): number[] {
    if (typeof v === 'number') return [v];
    if (typeof v !== 'string') return [];
    return v
        .split(',')
        .map((s) => parseInt(s, 10))
        .filter((n) => isFinite(n));
}

/**
 * A concentration code (S-411 `totalConcentration`, `partialConcentration`, which are SIGRID-3's
 * but for ice free, open water and bergy water) in tenths: 7, 9+, 10, a range 7-9, X; undefined
 * for no ice.
 */
export function concentrationFigure(code: number): string | undefined {
    if (code === 91) return '9+';
    if (code === 92) return '10';
    if (code === 81) return '8-10';
    if (code === 99) return 'X';
    if (code >= 10 && code <= 90 && code % 10 === 0) return String(code / 10);
    const lo = Math.floor(code / 10);
    const hi = code % 10;
    if (lo >= 1 && hi > lo) return `${lo}-${hi}`;
    return undefined;
}

/** WMO egg figures for the S-411 stage-of-development codes (SIGRID-3's, WMO No. 259). */
const STAGE: Readonly<Record<number, string>> = {
    81: '1',
    82: '2',
    83: '3',
    84: '4',
    85: '5',
    86: '6',
    87: '7',
    88: '8',
    89: '9',
    91: '1•',
    93: '4•',
    95: '7•',
    96: '8•',
    97: '9•',
    98: '▲',
    99: 'X',
};

/** WMO egg figures for the S-411 floe-size codes (its own enumeration, 1 pancake to 11 icebergs). */
const FORM: Readonly<Record<number, string>> = {1: '0', 2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '▲', 99: 'X'};

export const stageFigure = (code: number): string | undefined => STAGE[code];
export const formFigure = (code: number): string | undefined => FORM[code];

/**
 * The egg an S-411 sea-ice area's attributes describe, or undefined when it holds no ice to
 * describe (no total concentration, ice free, open water or bergy water).
 */
export function eggCodeOf(s100: Readonly<Record<string, string | number>> | undefined): EggCode | undefined {
    if (!s100) return undefined;
    const ct = codesOf(s100.totalConcentration)[0];
    const total = ct === undefined ? undefined : concentrationFigure(ct);
    if (!total) return undefined;
    // Sea-ice stages only: a lake-ice area's stages are other codes, with no egg figures.
    const stages = codesOf(s100.iceStageofDevelopment)
        .slice(0, 3)
        .map((c) => stageFigure(c) ?? '');
    // Ca is left out when only one stage is reported: Ct says it all.
    const partial = stages.length > 1 ? codesOf(s100.partialConcentration).slice(0, 3).map((c) => concentrationFigure(c) ?? '') : [];
    const forms = codesOf(s100.floeSizes)
        .slice(0, 3)
        .map((c) => formFigure(c) ?? '');
    return {total, partial, stages, forms};
}

// The oval, in glyph units: 30 tall, 24 wide, with the rows' baselines and the lines between them.
const BOX = 30;
const CX = 15;
const CY = 15;
const RX = 12;
const RY = 14.5;
const ROWS = [5.6, 11.9, 18.3, 24.6];
const LINES = [8.7, 15.1, 21.5];
const COLUMN = 6.6;
const TEXT = 4.8;
/** The egg's scale at full size: about 67 px tall, its figures 9 px. */
const EGG_SCALE = 1.8;

/** The egg as a glyph: a halo-filled oval in the standard's black, its rows of figures and lines. */
export function eggGlyph(egg: EggCode): GlyphDef {
    const parts: GlyphPart[] = [{d: `M${CX - RX} ${CY}A${RX} ${RY} 0 1 0 ${CX + RX} ${CY}A${RX} ${RY} 0 1 0 ${CX - RX} ${CY}Z`, fill: 'halo', stroke: 'black', width: 0.7}];
    for (const y of LINES) {
        const half = RX * Math.sqrt(1 - ((y - CY) / RY) ** 2);
        parts.push({d: `M${(CX - half).toFixed(2)} ${y}H${(CX + half).toFixed(2)}`, stroke: 'black', width: 0.55});
    }
    const row = (figures: string[], y: number) => {
        const shown = figures.slice(0, 3);
        shown.forEach((text, i) => {
            if (text) parts.push({text, x: CX + (i - (shown.length - 1) / 2) * COLUMN, y, size: TEXT, color: 'black'});
        });
    };
    row([egg.total], ROWS[0]);
    row(egg.partial, ROWS[1]);
    row(egg.stages, ROWS[2]);
    row(egg.forms, ROWS[3]);
    return {parts, box: BOX, scale: EGG_SCALE};
}

/** The smallest an egg is drawn, as a share of its full size; smaller, it is left out. */
const MIN_EGG_SCALE = 0.75;

/** An S-411 sea-ice area: its colour-code style, and its egg where it fits. */
export const iceAreaPainter: Painter = (input) => {
    const paints: Paint[] = areaStylePainter(input);
    if (!getMetocConfig().showLabels) return paints;
    const egg = eggCodeOf(input.props.s100);
    if (!egg) return paints;
    const glyph = eggGlyph(egg);
    const px = 1.25 * EGG_SCALE * input.resolution;
    const fit = labelAnchorInRing(input.walker.path, (RX + 1) * px, (RY + 1) * px);
    if (fit.scale < MIN_EGG_SCALE) return paints;
    const scale = Math.min(1, fit.scale);
    paints.push(...paintGlyph({...glyph, scale: EGG_SCALE * scale}, {at: fit.at, resolution: input.resolution, main: 'black'}));
    return paints;
};
