/**
 * # Points
 *
 * The pressure centres (Table M-II, 110100–110202), calm winds (140100) and the wind barb (Table
 * M-I's barb rule). Every one is a screen-sized glyph around its anchor: sizes are CSS pixels times
 * the resolution, so a symbol is the same size at every zoom, like the decoration on the lines.
 *
 * The letters are text marks, not outlines, so both renderers draw them with the same font
 * machinery as every other label and they stay crisp at any size.
 *
 * ## The wind barb (Table M-I)
 *
 * - The shaft points the way the wind blows **from**, to the nearest 10 degrees, from a plot circle
 *   at the anchor.
 * - Speed is built from the tip back: pennants (50 kt), barbs (10 kt), a half barb (5 kt). Speeds
 *   of 5 kt or more round to the nearest 5; 1–2 kt is the shaft alone. A missing speed is an X at
 *   the end of the shaft. A missing direction draws the plot circle alone ("not displayed").
 * - Barbs and pennants "lie back from the shaft at an angle of 120 degrees", on the left of the
 *   shaft in the Northern Hemisphere and the right in the Southern — read from the anchor's own
 *   latitude, so a barb drawn south of the equator turns itself over. Left is as the WMO and NWS
 *   station model reads it, looking down the wind from the shaft's tip to the station: a north
 *   wind's barbs stand east of its shaft and a west wind's north of it, toward the low pressure.
 */

import {getMetocSpec, type MetocGraphicName} from '../core/catalog.js';
import {colorOf, getMetocConfig, lineWidth} from '../core/config.js';
import {GLYPH_PX, circleRing, estimateTextWidth, type Paint, type ProjectedPosition as P} from '@zaes/symbology-engine';
import {paintGlyph} from './glyph.js';
import type {Painter, PainterInput} from './paints.js';

/** The letter size of a pressure centre, in CSS pixels. */
export const CENTRE_LETTER_PX = 30;
/** The size of the height written in a tropopause box, in CSS pixels. */
const TROPOPAUSE_VALUE_PX = 15;
/** The wind barb's shaft, in CSS pixels from the anchor to the tip. */
export const BARB_SHAFT_PX = 40;
const BARB_PX = 15;
const BARB_SPACING_PX = 5;
const PENNANT_BASE_PX = 6;
const PLOT_CIRCLE_PX = 5;

const anchorOf = (input: PainterInput): P => input.walker.path[0];
const at = (o: P, dx: number, dy: number): P => [o[0] + dx, o[1] + dy];

/** A text mark; `symbol` for text that is part of the symbol (a letter, a station plot's figures), not a label on it. */
function text(point: P, value: string, color: string, sizePx: number, symbol = false): Paint {
    return {role: 'label', geometry: {type: 'Point', coordinates: point}, text: {text: value, color, sizePx, haloColor: getMetocConfig().labelHalo, rotation: 0, ...(symbol ? {symbol} : {})}};
}

/** A pressure centre's letter, with the central pressure ("dynamic tag P") below it when given. */
function letter(char: string, withValue: boolean): Painter {
    return (input) => {
        const o = anchorOf(input);
        const r = input.resolution;
        const color = colorOf(input.spec.colors[0]);
        const out: Paint[] = [text(o, char, color, CENTRE_LETTER_PX, true)];
        const value = input.props.value?.trim();
        if (withValue && value) out.push(text(at(o, 0, -(CENTRE_LETTER_PX * 0.5 + 10) * r), value, color, getMetocConfig().labelSize + 1));
        return out;
    };
}

/**
 * A tropopause box: a five-sided outline whose point is down for a low and up for a high, with
 * the height and the letter inside — the height above the L, below the H, as Table M-II draws them.
 */
function tropopause(kind: 'L' | 'H'): Painter {
    return (input) => {
        const o = anchorOf(input);
        const r = input.resolution;
        const color = colorOf(input.spec.colors[0]);
        const value = input.props.value?.trim();
        // Wide enough for the height written in it, never narrower than the drawing.
        const w = Math.max(26, (value ? estimateTextWidth(value, TROPOPAUSE_VALUE_PX) : 0) / 2 + 5) * r;
        const h = 24 * r;
        const tip = 9 * r;
        const s = kind === 'L' ? -1 : 1;
        // Square body, the point on the low side for L and the high side for H.
        const ring: P[] =
            kind === 'L'
                ? [at(o, -w, h), at(o, w, h), at(o, w, -h + tip), at(o, 0, -h - tip * 0.4), at(o, -w, -h + tip), at(o, -w, h)]
                : [at(o, -w, -h), at(o, w, -h), at(o, w, h - tip), at(o, 0, h + tip * 0.4), at(o, -w, h - tip), at(o, -w, -h)];
        const out: Paint[] = [
            {role: 'decoration', geometry: {type: 'Polygon', coordinates: [ring]}, fill: {color: getMetocConfig().labelHalo}, stroke: {color, widthPx: lineWidth() + 1}},
        ];
        // Low: height on top, L below (the point is down). High: H on top, height below.
        out.push(text(at(o, 0, s * 9 * r), kind, color, 17, true));
        if (value) out.push(text(at(o, 0, -s * 9 * r), value, color, TROPOPAUSE_VALUE_PX));
        return out;
    };
}

/** Calm winds: a circle around a smaller one (Point4). */
const calmWinds: Painter = (input) => {
    const o = anchorOf(input);
    const r = input.resolution;
    const color = colorOf(input.spec.colors[0]);
    const ring = (px: number): Paint => ({role: 'decoration', geometry: {type: 'LineString', coordinates: circleRing(o, px * r, 32)}, stroke: {color, widthPx: lineWidth()}});
    return [ring(11), ring(4)];
};

/**
 * The barbs for a speed, from the tip back: how many pennants, full barbs and half barbs, after
 * Table M-I's rounding. `null` for a missing speed.
 */
export function barbCounts(speed: number | undefined): {pennants: number; barbs: number; halves: number} | null {
    if (speed === undefined || !isFinite(speed)) return null;
    if (speed < 5) return {pennants: 0, barbs: 0, halves: 0};
    let rest = Math.round(speed / 5) * 5;
    const pennants = Math.floor(rest / 50);
    rest -= pennants * 50;
    const barbs = Math.floor(rest / 10);
    rest -= barbs * 10;
    return {pennants, barbs, halves: rest >= 5 ? 1 : 0};
}

/** The wind barb. */
const windBarb: Painter = (input) => barb(input, PLOT_CIRCLE_PX, true);

/** A barb's shaft and its barbs, from a plot circle of `circlePx`, with the circle itself or not. */
function barb(input: PainterInput, circlePx: number, withCircle: boolean): Paint[] {
    const o = anchorOf(input);
    const r = input.resolution;
    const color = colorOf(input.spec.colors[0]);
    const stroke = (coordinates: P[]): Paint => ({role: 'decoration', geometry: {type: 'LineString', coordinates}, stroke: {color, widthPx: lineWidth()}});
    const out: Paint[] = withCircle ? [stroke(circleRing(o, circlePx * r, 20))] : [];

    const dir = input.props.windDirection;
    if (dir === undefined || !isFinite(dir)) return out;
    const theta = ((Math.round(dir / 10) * 10) % 360) * (Math.PI / 180);
    // Toward where the wind comes from, in projected space (x east, y north).
    const u: P = [Math.sin(theta), Math.cos(theta)];
    // Left of the shaft looking down the wind (from the tip to the station) in the north, right in
    // the south. Looking from the tip, left is the clockwise side of the shaft's own direction.
    const side = o[1] >= 0 ? -1 : 1;
    // "Lie back from the shaft at 120 degrees": 60 degrees off the shaft's own direction.
    const a = (side * Math.PI) / 3;
    const b: P = [u[0] * Math.cos(a) - u[1] * Math.sin(a), u[0] * Math.sin(a) + u[1] * Math.cos(a)];
    const along = (d: number): P => at(o, u[0] * d * r, u[1] * d * r);
    const tipPx = BARB_SHAFT_PX;

    out.push({role: 'line', geometry: {type: 'LineString', coordinates: [along(circlePx), along(tipPx)]}, stroke: {color, widthPx: lineWidth()}});

    const counts = barbCounts(input.props.windSpeed);
    if (!counts) {
        // Missing speed: an X at the end of the shaft.
        const t = along(tipPx);
        const n: P = [-u[1], u[0]];
        const k = 4 * r;
        out.push(stroke([at(t, (u[0] + n[0]) * k, (u[1] + n[1]) * k), at(t, (-u[0] - n[0]) * k, (-u[1] - n[1]) * k)]));
        out.push(stroke([at(t, (u[0] - n[0]) * k, (u[1] - n[1]) * k), at(t, (-u[0] + n[0]) * k, (-u[1] + n[1]) * k)]));
        return out;
    }

    let d = tipPx;
    for (let i = 0; i < counts.pennants; i++) {
        const base = along(d);
        const back = along(d - PENNANT_BASE_PX);
        out.push({
            role: 'decoration',
            geometry: {type: 'Polygon', coordinates: [[base, at(base, b[0] * BARB_PX * r, b[1] * BARB_PX * r), back, base]]},
            fill: {color},
            stroke: {color, widthPx: 1},
        });
        d -= PENNANT_BASE_PX + 1;
    }
    if (counts.pennants > 0) d -= 2;
    for (let i = 0; i < counts.barbs; i++) {
        const p = along(d);
        out.push(stroke([p, at(p, b[0] * BARB_PX * r, b[1] * BARB_PX * r)]));
        d -= BARB_SPACING_PX;
    }
    if (counts.halves) {
        // A lone half barb sits a step in from the tip, so it is not read as a full one.
        if (counts.pennants === 0 && counts.barbs === 0) d -= BARB_SPACING_PX;
        const p = along(d);
        out.push(stroke([p, at(p, (b[0] * BARB_PX * r) / 2, (b[1] * BARB_PX * r) / 2)]));
    }
    return out;
}

// ── the station plot ───────────────────────────────────────────────────────────

/** The plot circle's cloud cover symbol, as a share of its own size: a circle about 13 px across. */
const PLOT_SCALE = 0.6;
/** A weather or tendency symbol beside the circle, as a share of its own size. */
const SIDE_SCALE = 0.55;
/** The gap between the plot circle and what stands beside it. */
const GAP_PX = 3;

/** The station model's pressure: tenths of a hectopascal, its last three digits (1013.2 → 132, 998.7 → 987). */
export function stationPressureCode(hPa: number): string {
    return String(((Math.round(hPa * 10) % 1000) + 1000) % 1000).padStart(3, '0');
}

/**
 * The station model's pressure change: tenths of a hectopascal with no sign, since the tendency
 * symbol shows it. Two digits as Table M-II draws it (1.9 → 19, 0.4 → 04), three from 10 hPa, as
 * the WMO code's three-digit group carries it (12.3 → 123); never more than 999.
 */
export function stationChangeCode(hPa: number): string {
    return String(Math.min(999, Math.round(Math.abs(hPa) * 10))).padStart(2, '0');
}

/**
 * A station plot, laid out as the WMO and NWS station model around Appendix M's own symbols: the
 * cloud cover symbol is the plot circle and the wind barb leaves it (Table M-I, Point5); the
 * temperature stands upper left, the dew point lower left, present weather left of the circle; the
 * pressure upper right, and the pressure change then its tendency symbol right of the circle
 * (Table M-II: "to the right of the plot circle just after the text value"). A piece that is
 * missing is left out; a missing sky cover is an empty circle.
 */
const stationPlot: Painter = (input) => {
    const o = anchorOf(input);
    const r = input.resolution;
    const p = input.props;
    const color = colorOf(input.spec.colors[0]);
    const radiusPx = 9 * GLYPH_PX * PLOT_SCALE;
    const sidePx = 24 * GLYPH_PX * SIDE_SCALE;
    const sizePx = getMetocConfig().labelSize;
    const glyphOf = (name: MetocGraphicName | undefined, fallback?: MetocGraphicName) => {
        const spec = name ? getMetocSpec(name) : fallback ? getMetocSpec(fallback) : undefined;
        return spec?.glyph ? spec : undefined;
    };
    const symbol = (name: MetocGraphicName | undefined, at_: P, scale: number, fallback?: MetocGraphicName): Paint[] => {
        const spec = glyphOf(name, fallback);
        return spec ? paintGlyph(spec.glyph!, {at: at_, resolution: r, main: colorOf(spec.colors[0]), scale}) : [];
    };
    // Text whose near edge is `edgePx` from the anchor on `side` (-1 left, 1 right), at `dyPx` up.
    const textAt = (value: string, side: -1 | 1, edgePx: number, dyPx: number): Paint => {
        const half = estimateTextWidth(value, sizePx) / 2;
        return text(at(o, side * (edgePx + half) * r, dyPx * r), value, color, sizePx, true);
    };

    const out: Paint[] = [...symbol(p.cloudCover, o, PLOT_SCALE, 'CloudClearSky' as MetocGraphicName), ...barb(input, radiusPx, false)];
    const rowPx = radiusPx + sizePx * 0.55;
    const near = radiusPx + GAP_PX;
    if (p.temperature !== undefined) out.push(textAt(String(Math.round(p.temperature)), -1, near, rowPx));
    if (p.dewPoint !== undefined) out.push(textAt(String(Math.round(p.dewPoint)), -1, near, -rowPx));
    if (p.pressure !== undefined) out.push(textAt(stationPressureCode(p.pressure), 1, near, rowPx));
    if (p.weather) out.push(...symbol(p.weather, at(o, -(near + sidePx / 2) * r, 0), SIDE_SCALE));
    let right = near;
    if (p.pressureChange !== undefined) {
        const code = stationChangeCode(p.pressureChange);
        out.push(textAt(code, 1, right, 0));
        right += estimateTextWidth(code, sizePx) + GAP_PX;
    }
    // A tendency symbol is narrow in its box: placed a third of the box in, it sits just after the digits.
    if (p.pressureTendency) out.push(...symbol(p.pressureTendency, at(o, (right + sidePx / 3) * r, 0), SIDE_SCALE));
    return out;
};

/** The shaft tip of a wind barb, in projected meters: where the editor's direction handle goes. */
export function windBarbTip(anchor: P, directionDeg: number, resolution: number): P {
    const theta = (directionDeg * Math.PI) / 180;
    return [anchor[0] + Math.sin(theta) * BARB_SHAFT_PX * resolution, anchor[1] + Math.cos(theta) * BARB_SHAFT_PX * resolution];
}

export const POINT_PAINTERS = {
    low: letter('L', true),
    cyclone: letter('C', false),
    high: letter('H', true),
    anticyclone: letter('A', false),
    tropopauseLow: tropopause('L'),
    tropopauseHigh: tropopause('H'),
    calmWinds,
    windBarb,
    stationPlot,
};
