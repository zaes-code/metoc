/**
 * # name → paint function
 *
 * One painter per graphic, in an exhaustive record so a new name cannot compile without a
 * picture. Each reads Appendix M's Table M-II entry for its graphic; the comment above each family
 * says which drawing it follows.
 *
 * Sizes are CSS pixels times the resolution, computed here per paint, so every decoration is the
 * same size on screen at every zoom. Nothing is cached between paints.
 *
 * **Which side.** Appendix M: "If R comes before L in sequence, the front is rendered in the way
 * shown" — and the drawings show pips below a line drawn right to left. Below is the left of
 * travel, so a front's pips point to the left of the drawn direction. Reverse the points to put
 * them on the other side.
 */

import {MetocGraphicName as N, type MetocColor, type MetocColorRole, type MetocGraphicSpec} from '../core/catalog.js';
import {colorOf, getMetocConfig, lineWidth, pipSize} from '../core/config.js';
import {circleRing, decorationFit, displacedPath, estimateTextWidth, evenSlots, offset, type Paint, type PathWalker, type ProjectedPosition as P, runsOutside, semicircleRing, triangleRing, uprightAngle} from '@zaes/symbology-engine';
import type {MetocProperties} from '../core/types.js';
import {AREA_PAINTERS} from './areaPaints.js';
import {POINT_PAINTERS} from './pointPaints.js';
import {areaStylePainter, glyphPainter, lineStylePainter} from './stylePaints.js';

/** What a painter is handed. */
export interface PainterInput {
    spec: MetocGraphicSpec;
    props: MetocProperties;
    /** The line as painted: smoothed when the config says so, in projected meters. */
    walker: PathWalker;
    /** Projected meters per CSS pixel. */
    resolution: number;
}

export type Painter = (input: PainterInput) => Paint[];

// ── shared pieces ──────────────────────────────────────────────────────────────

/** The graphic's colour for a role, honouring an operator's choice where the standard allows one. */
function roleColor(input: PainterInput, role: MetocColor): string {
    const {spec, props} = input;
    if (spec.operatorColor && props.color && role === spec.colors[0]) return props.color;
    return colorOf(role);
}

const mainColor = (input: PainterInput) => roleColor(input, input.spec.colors[0]);

function line(coordinates: P[], color: string, dashPx?: readonly number[], widthPx = lineWidth()): Paint {
    return {role: 'line', geometry: {type: 'LineString', coordinates}, stroke: {color, widthPx, ...(dashPx ? {dashPx} : {})}};
}

function solidShape(ring: P[], color: string): Paint {
    return {role: 'decoration', geometry: {type: 'Polygon', coordinates: [ring]}, fill: {color}, stroke: {color, widthPx: 1}};
}

function hollowShape(ring: P[], color: string): Paint {
    return {role: 'decoration', geometry: {type: 'LineString', coordinates: ring}, stroke: {color, widthPx: lineWidth()}};
}

function stroke(coordinates: P[], color: string, widthPx = lineWidth()): Paint {
    return {role: 'decoration', geometry: {type: 'LineString', coordinates}, stroke: {color, widthPx}};
}

const whole = (w: PathWalker) => w.slice(0, w.length);

/** The line alone, when the graphic is too small on screen for its decoration. */
function plain(input: PainterInput, dashPx?: readonly number[]): Paint[] {
    return [line(whole(input.walker), mainColor(input), dashPx)];
}

// ── fronts: pips on the line ───────────────────────────────────────────────────

interface PipMark {
    kind: 'triangle' | 'semicircle';
    role: MetocColorRole;
    side: 1 | -1;
}

interface FrontOptions {
    /** The repeating marks, in order along the line. */
    marks: PipMark[];
    hollow?: boolean;
    /** Frontogenesis: a dot between pips. Frontolysis: a crossing stroke. */
    separator?: 'dot' | 'cross';
    /** Stationary fronts colour each stretch of line like the pip on it. */
    colorLineByMark?: boolean;
}

/** Spacing between pips, in pip sizes: one kind of pip spaces wider than alternating ones. */
const SINGLE_PIP_SPACING = 6;
const ALTERNATING_PIP_SPACING = 3.5;

function front(opts: FrontOptions): Painter {
    return (input) => {
        const {walker: w, resolution: res} = input;
        const sizePx = pipSize();
        const spacingPx = sizePx * (opts.marks.length > 1 ? ALTERNATING_PIP_SPACING : SINGLE_PIP_SPACING);
        const fit = decorationFit(w.length / res, spacingPx, sizePx);
        if (fit === 0) return plain(input);

        const size = sizePx * fit * res;
        const slots = evenSlots(w.length, spacingPx * fit * res);
        const paints: Paint[] = [];

        // Gaps in the line where a separator sits, half-way between pips.
        const gaps: [number, number][] = [];
        const separators: number[] = [];
        if (opts.separator) {
            for (let i = 1; i < slots.count; i++) {
                const at = i * slots.spacing;
                separators.push(at);
                gaps.push([at - size * 0.6, at + size * 0.6]);
            }
        }

        // The line: one run per gap-free stretch, coloured per mark when the front asks for it.
        if (opts.colorLineByMark) {
            for (let i = 0; i < slots.count; i++) {
                const from = i * slots.spacing;
                const to = from + slots.spacing;
                const color = roleColor(input, opts.marks[i % opts.marks.length].role);
                const localGaps = gaps.filter(([a, b]) => b > from && a < to).map(([a, b]) => [Math.max(a, from), Math.min(b, to)] as [number, number]);
                const sub = runsOutside(w, [[0, from], ...localGaps, [to, w.length]]);
                for (const run of sub) paints.push(line(run, color));
            }
        } else {
            for (const run of runsOutside(w, gaps)) paints.push(line(run, mainColor(input)));
        }

        for (let i = 0; i < slots.count; i++) {
            const mark = opts.marks[i % opts.marks.length];
            const at = (i + 0.5) * slots.spacing;
            const color = roleColor(input, mark.role);
            const ring =
                mark.kind === 'triangle' ? triangleRing(w, at, size * 1.2, size, mark.side) : semicircleRing(w, at, size * 0.6, mark.side);
            paints.push(opts.hollow ? hollowShape(ring, color) : solidShape(ring, color));
        }

        for (const at of separators) {
            const {point, dir} = w.at(at);
            const color = opts.colorLineByMark ? roleColor(input, opts.marks[0].role) : mainColor(input);
            if (opts.separator === 'dot') {
                paints.push(solidShape(circleRing(point, size * 0.22), color));
            } else {
                // A short stroke crossing the gap at sixty degrees, as Table M-II draws it.
                const half = size * 0.7;
                const c = Math.cos(Math.PI / 3);
                const s = Math.sin(Math.PI / 3);
                paints.push(stroke([offset(point, dir, -half * c, -half * s), offset(point, dir, half * c, half * s)], color));
            }
        }
        return paints;
    };
}

const cold = (side: 1 | -1 = 1): PipMark => ({kind: 'triangle', role: 'cold', side});
const warm = (side: 1 | -1 = 1): PipMark => ({kind: 'semicircle', role: 'warm', side});
const occludedTriangle: PipMark = {kind: 'triangle', role: 'occluded', side: 1};
const occludedSemicircle: PipMark = {kind: 'semicircle', role: 'occluded', side: 1};
// A stationary front's warm pips point one way and its cold pips the other (Table M-II).
const stationary: PipMark[] = [warm(-1), cold(1)];

// ── pressure lines ─────────────────────────────────────────────────────────────

/** Ridge axis: "a solid zigzag line", the zigzag "at regular intervals along the entire length". */
const ridgeAxis: Painter = (input) => {
    const {walker: w, resolution: res} = input;
    const sizePx = pipSize();
    const fit = decorationFit(w.length / res, sizePx * 2.4, sizePx);
    if (fit === 0) return plain(input);
    const slots = evenSlots(w.length, sizePx * 2.4 * fit * res);
    const amp = sizePx * 0.8 * fit * res;
    const pts: P[] = [];
    for (let i = 0; i <= slots.count * 2; i++) {
        const s = (i * slots.spacing) / 2;
        const {point, dir} = w.at(s);
        pts.push(offset(point, dir, 0, i % 2 === 1 ? amp : 0));
    }
    return [line(pts, mainColor(input))];
};

/**
 * Severe squall line (Line2): "a short line section and an alternating V shape". Each V straddles
 * the line across it, its point on the side the line moves to (left of the drawn direction, as a
 * front's pips) and its arms open the other way; the line breaks where the arms cross it, as
 * Table M-II draws it.
 */
const squallLine: Painter = (input) => {
    const {walker: w, resolution: res} = input;
    const sizePx = pipSize();
    const fit = decorationFit(w.length / res, sizePx * 5, sizePx);
    if (fit === 0) return plain(input);
    const width = sizePx * 1.1 * fit * res;
    const height = sizePx * 1.3 * fit * res;
    const slots = evenSlots(w.length, sizePx * 5 * fit * res);
    const color = mainColor(input);
    const gaps: [number, number][] = [];
    const paints: Paint[] = [];
    for (let i = 0; i < slots.count; i++) {
        const at = (i + 0.5) * slots.spacing;
        const {point, dir} = w.at(at);
        // The arms run from 55% of the height behind the line to a point 45% ahead of it, so each
        // crosses the line 22.5% of the width from the V's centre: that is where the line stops.
        gaps.push([at - width * 0.225, at + width * 0.225]);
        paints.push(stroke([offset(point, dir, -width / 2, -height * 0.55), offset(point, dir, 0, height * 0.45), offset(point, dir, width / 2, -height * 0.55)], color));
    }
    return [...runsOutside(w, gaps).map((r) => line(r, color)), ...paints];
};

/**
 * Instability line (Line3) and shear line (Line4): a wavy line broken at each crossing of its
 * axis, with two dots (instability) or one (shear) in the break.
 */
function dottedWave(dots: 1 | 2): Painter {
    return (input) => {
        const {walker: w, resolution: res} = input;
        const sizePx = pipSize();
        const wavelengthPx = sizePx * 4;
        const fit = decorationFit(w.length / res, wavelengthPx, sizePx);
        if (fit === 0) return plain(input);
        const size = sizePx * fit * res;
        const slots = evenSlots(w.length, (wavelengthPx / 2) * fit * res);
        const half = slots.spacing;
        const amp = size * 0.7;
        const gapHalf = size * (dots === 2 ? 0.55 : 0.4);
        const color = mainColor(input);
        const paints: Paint[] = [];
        const f = (s: number) => amp * Math.sin((Math.PI * s) / half);
        for (let i = 0; i < slots.count; i++) {
            const from = i * half + (i === 0 ? 0 : gapHalf);
            const to = (i + 1) * half - (i === slots.count - 1 ? 0 : gapHalf);
            if (to > from) paints.push(line(displacedPath(w, from, to, size * 0.25, f), color));
        }
        for (let i = 1; i < slots.count; i++) {
            const node = i * half;
            const offsets = dots === 2 ? [-size * 0.22, size * 0.22] : [0];
            for (const o of offsets) {
                paints.push(solidShape(circleRing(w.at(node + o).point, size * 0.16), color));
            }
        }
        return paints;
    };
}

/** Convergence line (Line6): a solid line crossed by slanted strokes. */
const convergenceLine: Painter = (input) => {
    const {walker: w, resolution: res} = input;
    const sizePx = pipSize();
    const fit = decorationFit(w.length / res, sizePx * 3, sizePx);
    if (fit === 0) return plain(input);
    const size = sizePx * fit * res;
    const slots = evenSlots(w.length, sizePx * 3 * fit * res);
    const color = mainColor(input);
    const paints: Paint[] = [line(whole(w), color)];
    for (let i = 0; i < slots.count; i++) {
        const {point, dir} = w.at((i + 0.5) * slots.spacing);
        paints.push(stroke([offset(point, dir, size * 0.35, -size * 0.35), offset(point, dir, -size * 0.7, size * 0.9)], color));
    }
    return paints;
};

/** Inter-tropical discontinuity (Line7): dashes alternating red and green. */
const itd: Painter = (input) => {
    const {walker: w, resolution: res} = input;
    const sizePx = pipSize();
    const dash = sizePx * 1.2 * res;
    const gap = sizePx * 0.6 * res;
    const paints: Paint[] = [];
    let d = 0;
    let i = 0;
    while (d < w.length) {
        const run = w.slice(d, Math.min(w.length, d + dash));
        if (run.length >= 2) paints.push(line(run, roleColor(input, input.spec.colors[i % 2])));
        d += dash + gap;
        i++;
    }
    return paints;
};

// ── winds ──────────────────────────────────────────────────────────────────────

/** Jet stream and stream line: "the arrowheads will be evenly spaced along the line". */
const arrowedLine: Painter = (input) => {
    const {walker: w, resolution: res} = input;
    const sizePx = pipSize();
    const color = mainColor(input);
    const paints: Paint[] = [line(whole(w), color)];
    const fit = decorationFit(w.length / res, sizePx * 12, sizePx, 1);
    const size = sizePx * Math.max(fit, 0.5) * res;
    const chevron = (at: number) => {
        const {point, dir} = w.at(at);
        return stroke([offset(point, dir, -size * 0.9, size * 0.75), point, offset(point, dir, -size * 0.9, -size * 0.75)], color);
    };
    if (fit > 0) {
        const slots = evenSlots(w.length, sizePx * 12 * fit * res);
        for (let i = 1; i < slots.count; i++) paints.push(chevron(i * slots.spacing));
    }
    paints.push(chevron(w.length));
    return paints;
};

// ── isopleths ──────────────────────────────────────────────────────────────────

const ISOPLETH_DASH: readonly number[] = [10, 6];

/**
 * An isopleth: its line, and its value "placed at each end of the line and once in the middle".
 * The middle label sits in a gap cut in the line and reads along it; the end labels sit beyond
 * each end.
 *
 * With `intervalPx`, the value is placed "at each end of the line and at regular intervals along
 * the line" instead (depth curves and contours, Table M-III): a gap and a label about every
 * `intervalPx`, evenly spaced, at least the middle one.
 */
function isopleth(dashed: boolean | ((props: MetocProperties) => boolean), options: {intervalPx?: number; widthPx?: number} = {}): Painter {
    return (input) => {
        const {walker: w, resolution: res, props} = input;
        const isDashed = typeof dashed === 'function' ? dashed(props) : dashed;
        const dashPx = isDashed ? ISOPLETH_DASH : undefined;
        const color = mainColor(input);
        const width = options.widthPx ?? lineWidth();
        const value = props.value?.trim();
        if (!value) return [line(whole(w), color, dashPx, width)];

        const cfg = getMetocConfig();
        const textPx = estimateTextWidth(value, cfg.labelSize);
        const halfGap = (textPx / 2 + 4) * res;
        const paints: Paint[] = [];
        // Where the inner labels go: the middle, or every interval.
        let stops = options.intervalPx ? Math.max(2, Math.round(w.length / (options.intervalPx * res))) : 2;
        // Fewer stops when the labels would crowd each other; none when even the middle one would not fit.
        while (stops > 2 && w.length / stops <= halfGap * 3) stops--;
        const inner = w.length > halfGap * 4 ? Array.from({length: stops - 1}, (_, k) => (w.length * (k + 1)) / stops) : [];
        for (const run of runsOutside(w, inner.map((at) => [at - halfGap, at + halfGap] as [number, number]))) paints.push(line(run, color, dashPx, width));

        const label = (point: P, dir: P): Paint => ({
            role: 'label',
            geometry: {type: 'Point', coordinates: point},
            text: {text: value, color, sizePx: cfg.labelSize, haloColor: cfg.labelHalo, rotation: uprightAngle(dir)},
        });
        const reach = (textPx / 2 + 6) * res;
        const start = w.at(0);
        const end = w.at(w.length);
        paints.push(label(offset(start.point, start.dir, -reach, 0), start.dir));
        paints.push(label(offset(end.point, end.dir, reach, 0), end.dir));
        for (const at of inner) {
            const m = w.at(at);
            paints.push(label(m.point, m.dir));
        }
        return paints;
    };
}

/**
 * The hand-written painters, for graphics with geometry of their own. Every other graphic is drawn
 * from its catalog entry's glyph or style ({@link painterFor}); a test holds that every name has
 * one or the other.
 */
export const METOC_PAINTERS: Readonly<Partial<Record<N, Painter>>> = {
    [N.LowPressureCenter]: POINT_PAINTERS.low,
    [N.CycloneCenter]: POINT_PAINTERS.cyclone,
    [N.TropopauseLow]: POINT_PAINTERS.tropopauseLow,
    [N.HighPressureCenter]: POINT_PAINTERS.high,
    [N.AnticycloneCenter]: POINT_PAINTERS.anticyclone,
    [N.TropopauseHigh]: POINT_PAINTERS.tropopauseHigh,
    [N.ColdFront]: front({marks: [cold()]}),
    [N.UpperColdFront]: front({marks: [cold()], hollow: true}),
    [N.ColdFrontogenesis]: front({marks: [cold()], separator: 'dot'}),
    [N.ColdFrontolysis]: front({marks: [cold()], separator: 'cross'}),
    [N.WarmFront]: front({marks: [warm()]}),
    [N.UpperWarmFront]: front({marks: [warm()], hollow: true}),
    [N.WarmFrontogenesis]: front({marks: [warm()], separator: 'dot'}),
    [N.WarmFrontolysis]: front({marks: [warm()], separator: 'cross'}),
    [N.OccludedFront]: front({marks: [occludedSemicircle, occludedTriangle]}),
    [N.UpperOccludedFront]: front({marks: [occludedSemicircle, occludedTriangle], hollow: true}),
    [N.OccludedFrontolysis]: front({marks: [occludedSemicircle, occludedTriangle], separator: 'cross'}),
    [N.StationaryFront]: front({marks: stationary, colorLineByMark: true}),
    [N.UpperStationaryFront]: front({marks: stationary, colorLineByMark: true, hollow: true}),
    [N.StationaryFrontogenesis]: front({marks: stationary, colorLineByMark: true, separator: 'dot'}),
    [N.StationaryFrontolysis]: front({marks: stationary, colorLineByMark: true, separator: 'cross'}),
    [N.TroughAxis]: (input) => plain(input, [10, 7]),
    [N.Trough]: (input) => plain(input),
    [N.RidgeAxis]: ridgeAxis,
    [N.SevereSquallLine]: squallLine,
    [N.InstabilityLine]: dottedWave(2),
    [N.ShearLine]: dottedWave(1),
    [N.InterTropicalConvergenceZone]: AREA_PAINTERS.convergenceZone,
    [N.ConvergenceLine]: convergenceLine,
    [N.InterTropicalDiscontinuity]: itd,
    [N.CalmWinds]: POINT_PAINTERS.calmWinds,
    [N.WindBarb]: POINT_PAINTERS.windBarb,
    [N.StationPlot]: POINT_PAINTERS.stationPlot,
    [N.JetStream]: arrowedLine,
    [N.StreamLine]: arrowedLine,
    [N.IsobarSurface]: isopleth(false),
    [N.ContourUpperAir]: isopleth(false),
    [N.Isotherm]: isopleth(true),
    [N.Isotach]: isopleth(true),
    [N.Isodrosotherm]: isopleth(false),
    [N.Thickness]: isopleth(true),
    [N.OperatorDefinedFreeformLine]: isopleth((props) => props.dashed === true),
    // Depth curves and contours carry their depth "at each end of the line and at regular intervals along the line".
    [N.DepthCurve]: isopleth(false, {intervalPx: 320, widthPx: 1.3}),
    [N.DepthContour]: isopleth(false, {intervalPx: 320, widthPx: 1.3}),
    [N.TropicalStormWindArea]: AREA_PAINTERS.tropicalStormWindArea,
    [N.InstrumentFlightRule]: AREA_PAINTERS.solid,
    [N.MarginalVisualFlightRule]: AREA_PAINTERS.scallop,
    [N.Turbulence]: AREA_PAINTERS.dots,
    [N.Icing]: AREA_PAINTERS.icing,
    [N.LiquidPrecipitation]: AREA_PAINTERS.solid,
    [N.ConvectivePrecipitation]: AREA_PAINTERS.dashDot,
    [N.FreezingPrecipitation]: AREA_PAINTERS.solid,
    [N.Thunderstorm]: AREA_PAINTERS.dashDot,
    [N.Fog]: AREA_PAINTERS.solid,
    [N.DustOrSand]: AREA_PAINTERS.solid,
    [N.OperatorDefinedFreeformArea]: AREA_PAINTERS.solid,
};

/** The painter for a graphic: its own, or the generic one for its glyph, line style or area style. */
export function painterFor(spec: MetocGraphicSpec): Painter | undefined {
    return METOC_PAINTERS[spec.name] ?? (spec.glyph ? glyphPainter : spec.lineStyle ? lineStylePainter : spec.areaStyle ? areaStylePainter : undefined);
}
