/**
 * # Library configuration
 *
 * One palette and a handful of sizes. There is no light or dark mode: only the host can see its
 * own basemap, so it sends the colours it wants (`{...DEFAULT_METOC_PALETTE, ...mine}`) and that is
 * the whole of a mode change. Values and pure functions only — this module is read by every
 * renderer and must stay importable anywhere.
 *
 * Read every value inside a function. A module-level `const w = getMetocConfig().lineWidth` freezes
 * the value at import and a host's later change never reaches it.
 */

import {isPointSize, type PointSize} from '@zaes/symbology-engine';
import type {MetocColor, MetocColorRole} from './specTypes.js';

/** The standard's colours (Appendix M, Table M-II), by role. */
export const DEFAULT_METOC_PALETTE: Readonly<Record<MetocColorRole, string>> = {
    cold: 'rgb(0, 0, 255)',
    warm: 'rgb(255, 0, 0)',
    occluded: 'rgb(111, 49, 152)',
    black: 'rgb(0, 0, 0)',
    convergence: 'rgb(255, 128, 0)',
    discontinuityGreen: 'rgb(13, 223, 39)',
    // The isotach and the tropical storm wind area's second ring are "Purple" with no RGB, and the
    // drawings colour them (255, 0, 255): the RGB Table M-III itself prints as "Purple" (140101).
    isotach: 'rgb(255, 0, 255)',
    // "Green" with no RGB.
    isodrosotherm: 'rgb(0, 128, 0)',
    // "Green" and "Yellow" in the area rows, also without RGB values; matched to the drawings.
    green: 'rgb(0, 128, 0)',
    yellow: 'rgb(255, 230, 0)',
    // "Brown" is printed once, as (124, 96, 13) on the icing rows; every brown uses it.
    brown: 'rgb(124, 96, 13)',
    icingBrown: 'rgb(124, 96, 13)',
    // Set 46: the drawings' dark grey and magenta.
    gray: 'rgb(128, 128, 128)',
    magenta: 'rgb(255, 0, 255)',
    white: 'rgb(255, 255, 255)',
};

export interface MetocConfig {
    /** Line work stroke width, in CSS pixels. */
    lineWidth: number;
    /** Size of a front's pips, in CSS pixels. Every other decoration is proportioned from it. */
    pipSize: number;
    /** Join the drawn points with a curve through each of them (Appendix M: "typically connected with a curved line"). Areas too. */
    smoothLines: boolean;
    /** Opacity of a filled area (Area2: "color filled with no outer boundary line"). */
    areaFillOpacity: number;
    /**
     * How large point graphics are drawn when a graphic states no `size`: small, medium or large
     * (×0.75, ×1, ×1.5 of the size the standard's drawings give). Medium by default.
     */
    pointSize: PointSize;
    /** Label font size, in CSS pixels. */
    labelSize: number;
    /** Colour of the halo behind labels. */
    labelHalo: string;
    /** The halo's width in CSS pixels; 0 draws text with no halo. */
    labelHaloWidth: number;
    /**
     * The colour of every label: values, heights, date-times. Absent (the default) means each label
     * takes its graphic's colour, as the standard draws them. A symbol's own text (a pressure
     * centre's H, a station plot's figures) keeps the symbol's colour.
     */
    labelColor?: string;
    /** A CSS font-family list for all text, labels and symbols alike. Absent: `sans-serif`. */
    labelFont?: string;
    /** Draw labels. Off, graphics show without their values, heights and date-times; a symbol's own text stays. */
    showLabels: boolean;
    /**
     * Let the operator turn a point symbol with a rotate handle, saved as `rotation`. Off by default:
     * the standard draws point symbols upright. The wind barb always turns, by its wind direction.
     */
    allowPointRotation: boolean;
    /**
     * Shrink point symbols as the map zooms out: full size at this map scale (the N of 1:N, at 96
     * pixels an inch) and anything closer in; past it, by the square root of how far out the map
     * is, so half size at four times the scale, and never below {@link pointMinScale}. Absent (the
     * default): point symbols keep their size at every zoom. On a flat map; in 3D they keep it.
     */
    pointFullSizeScale?: number;
    /** The smallest a shrinking point symbol gets, as a share of its full size. */
    pointMinScale: number;
    palette: Record<MetocColorRole, string>;
    /**
     * The line colour of every graphic the standard draws **black**, and of nothing else: an
     * isobar, a trough, a barb, a sounding, a black outline. Black vanishes on a dark or imagery
     * map, so a host picks what reads there. Every Table M-II colour stays as it is. Absent (the
     * default) means the palette's black.
     */
    defaultLineColor?: string;
    /** Editor chrome: vertex handles, the insert handles, the selection outline. */
    handleColor: string;
    selectionColor: string;
    /** The ring round a handle, and the fill of an insert handle. Absent: white. */
    handleOutlineColor?: string;
    /** The ring of an insert ("+") handle. Absent: `handleColor`. */
    insertHandleColor?: string;
    /** The rotate handle (the wind barb's shaft tip, or a turned symbol's). Absent: `handleColor`. */
    rotateHandleColor?: string;
    /** A point symbol's resize handle. Absent: `handleColor`. */
    resizeHandleColor?: string;
    /** The construction line through the drawn points. Absent: `handleColor`. */
    guideColor?: string;
    /** The selection highlight's width in CSS pixels. Absent: `lineWidth` + 10. */
    selectionWidth?: number;
}

/**
 * Settings for a light basemap: the standard's colours, a white halo. Passing it after
 * {@link METOC_DARK_MAP} puts back everything that one changed.
 */
export const METOC_LIGHT_MAP: Readonly<MetocConfigOptions> = Object.freeze({
    palette: {...DEFAULT_METOC_PALETTE},
    labelHalo: 'rgba(255, 255, 255, 0.9)',
    selectionColor: 'rgba(0, 153, 255, 0.55)',
});

/**
 * Settings for a dark or imagery basemap: the standard's black drawn light, a dark halo, a lighter
 * selection. Every other Table M-II colour stays as the standard gives it.
 */
export const METOC_DARK_MAP: Readonly<MetocConfigOptions> = Object.freeze({
    palette: {...DEFAULT_METOC_PALETTE, black: 'rgb(226, 230, 235)'},
    labelHalo: 'rgba(17, 22, 28, 0.9)',
    selectionColor: 'rgba(100, 168, 240, 0.5)',
});

const DEFAULTS: MetocConfig = {
    lineWidth: 2,
    pipSize: 10,
    smoothLines: true,
    areaFillOpacity: 0.35,
    pointSize: 'medium',
    labelSize: 13,
    labelHalo: 'rgba(255, 255, 255, 0.9)',
    labelHaloWidth: 3,
    showLabels: true,
    allowPointRotation: false,
    pointMinScale: 0.4,
    palette: {...DEFAULT_METOC_PALETTE},
    handleColor: 'rgb(255, 140, 0)',
    selectionColor: 'rgba(0, 153, 255, 0.55)',
};

/**
 * The ranges {@link configureMetoc} holds each number to. A value outside its range is clamped to
 * it; one that is not a finite number is ignored.
 */
export const METOC_CONFIG_RANGES: Readonly<
    Record<'lineWidth' | 'pipSize' | 'labelSize' | 'labelHaloWidth' | 'areaFillOpacity' | 'selectionWidth' | 'pointFullSizeScale' | 'pointMinScale', readonly [number, number]>
> = Object.freeze({
    lineWidth: [1, 8],
    pipSize: [4, 24],
    labelSize: [8, 26],
    labelHaloWidth: [0, 8],
    areaFillOpacity: [0, 1],
    selectionWidth: [2, 30],
    pointFullSizeScale: [1_000, 1_000_000_000],
    pointMinScale: [0.1, 1],
});

const COLOR_FIELDS = ['labelHalo', 'handleColor', 'selectionColor'] as const;
/** Settings a host may leave unset; `undefined` removes one. */
const OPTIONAL_COLORS = ['defaultLineColor', 'labelColor', 'handleOutlineColor', 'insertHandleColor', 'rotateHandleColor', 'resizeHandleColor', 'guideColor'] as const;
const BOOLEANS = ['smoothLines', 'showLabels', 'allowPointRotation'] as const;
/**
 * A CSS colour by its form: hex, a colour function (`rgb()`, `hsl()`, `oklch()` …) or a keyword.
 * Without a DOM a keyword cannot be checked against the list; the form is enough to refuse a typo
 * such as `##ffd400`, which a canvas would draw black.
 */
const CSS_COLOR = /^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)|[a-z]+)$/;

const isColor = (v: unknown): v is string => typeof v === 'string' && CSS_COLOR.test(v.trim().toLowerCase());

/** Settings for {@link configureMetoc}: any subset, with any subset of the palette. */
export type MetocConfigOptions = Partial<Omit<MetocConfig, 'palette'>> & {palette?: Partial<Record<MetocColorRole, string>>};

/**
 * The configuration in force, kept on `globalThis` under a registered symbol, so an application
 * that loads this package twice — its ES module and its CommonJS build — still has one
 * configuration. Created on first use, never at module load.
 */
const STATE_KEY = Symbol.for('@zaes/metoc/config');

function state(): {current: Readonly<MetocConfig>} {
    const g = globalThis as unknown as Record<symbol, {current: Readonly<MetocConfig>} | undefined>;
    return (g[STATE_KEY] ??= {current: frozen(DEFAULTS)});
}

function frozen(config: MetocConfig): Readonly<MetocConfig> {
    return Object.freeze({...config, palette: Object.freeze({...config.palette})}) as Readonly<MetocConfig>;
}

/**
 * Merge settings into the current configuration. A renderer reads it on its next paint.
 *
 * Numbers are clamped to {@link METOC_CONFIG_RANGES}. A value of the wrong kind — a number that is
 * not finite, a string not in a CSS colour's form, an unknown point size or palette role —
 * is ignored, and the setting in force stays. An optional setting set to `undefined` (or a blank
 * `labelFont`) is removed.
 */
export function configureMetoc(options: MetocConfigOptions): void {
    const next: MetocConfig = {...state().current, palette: {...state().current.palette}};
    for (const [key, [min, max]] of Object.entries(METOC_CONFIG_RANGES) as [keyof typeof METOC_CONFIG_RANGES, readonly [number, number]][]) {
        const v = options[key];
        if (typeof v === 'number' && Number.isFinite(v)) next[key] = Math.min(max, Math.max(min, v));
        else if ((key === 'selectionWidth' || key === 'pointFullSizeScale') && key in options && v === undefined) delete next[key];
    }
    for (const key of BOOLEANS) if (typeof options[key] === 'boolean') next[key] = options[key] as boolean;
    if (isPointSize(options.pointSize)) next.pointSize = options.pointSize;
    for (const key of COLOR_FIELDS) if (isColor(options[key])) next[key] = options[key] as string;
    for (const key of OPTIONAL_COLORS) {
        if (!(key in options)) continue;
        if (options[key] === undefined) delete next[key];
        else if (isColor(options[key])) next[key] = options[key];
    }
    if ('labelFont' in options) {
        // A font-family list: names, quoted names and commas; nothing that could end the CSS font.
        const font = options.labelFont?.trim();
        if (!font) delete next.labelFont;
        else if (/^[\w\s"',-]+$/.test(font)) next.labelFont = font;
    }
    for (const [role, color] of Object.entries(options.palette ?? {})) {
        if (Object.prototype.hasOwnProperty.call(DEFAULT_METOC_PALETTE, role) && isColor(color)) next.palette[role as MetocColorRole] = color;
    }
    state().current = frozen(next);
}

/** Back to the standard's defaults. */
export function resetMetocConfig(): void {
    state().current = frozen(DEFAULTS);
}

/** The configuration in force. Frozen: change it with {@link configureMetoc}. */
export function getMetocConfig(): Readonly<MetocConfig> {
    return state().current;
}

export function lineWidth(): number {
    return state().current.lineWidth;
}

export function pipSize(): number {
    return state().current.pipSize;
}

/** A role's colour from the palette; an exact CSS colour passes through unchanged. */
export function colorOf(color: MetocColor): string {
    const current = state().current;
    if (color === 'black' && current.defaultLineColor) return current.defaultLineColor;
    return (current.palette as Record<string, string>)[color] ?? color;
}

/** What the standard's black is drawn in now: {@link MetocConfig.defaultLineColor}, else the palette's black. */
export function getDefaultLineColor(): string {
    return colorOf('black');
}
