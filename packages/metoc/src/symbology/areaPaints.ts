/**
 * # Areas
 *
 * Table M-II draws the bounded areas of weather (170100–171000) as one outline each — solid,
 * dash-dot, scalloped, dotted or ticked — in the graphic's colour, and Table M-I's Area2 lets the
 * operator "depict the area color filled with no outer boundary line". The tropical storm wind area
 * (162004, Area1) is a solid outline whose colour says which wind radius it is, with a boxed
 * date-time label tied to the storm by a leader line.
 *
 * The walker a painter receives is the closed, smoothed ring. Decoration is screen-sized as on the
 * lines, and nothing here depends on which way round the operator traced the area: the outward
 * side is read from the ring ({@link outwardSide}).
 *
 * ## Labels
 *
 * - A label **centred in an area** is shrunk until it genuinely fits the ring — tested against the
 *   ring, not its bounding box, because traced areas are concave — and dropped when that leaves
 *   it unreadable. Its size starts from the configured label size, capped at a share of the
 *   area's own on-screen size so it never fills the shape.
 * - A label **outside** an area has no ring to hold it, so it is capped at a quarter of the
 *   graphic's on-screen size instead.
 * - A label **on the outline** sits in a gap cut in the outline and reads along it, as an
 *   isopleth's value does.
 * - An absent value or date-time draws nothing; an empty one never draws an empty box.
 */

import {arcOver, boundsOf, circleRing, decorationFit, estimateTextWidth, evenSlots, fitScaleInRing, offset, outwardSide, type Paint, type PathWalker, pointInRing, type ProjectedPosition as P, ringCentroid, runsOutside, uprightAngle} from '@zaes/symbology-engine';
import {getMetocConfig, lineWidth, pipSize} from '../core/config.js';
import type {MetocColor} from '../core/catalog.js';
import type {Painter, PainterInput} from './paints.js';
import {colorOf} from '../core/config.js';

/** Share of an area's on-screen size its centred label may stand. */
export const AREA_LABEL_SHARE = 0.4;
/** Share of a graphic's on-screen size a label outside it may stand. */
export const OUTSIDE_LABEL_SHARE = 0.25;
/** Below this a label is not drawn: text that small is noise, not information. */
export const MIN_LABEL_PX = 7;

const DASH_DOT: readonly number[] = [12, 5, 2, 5];
const DASHED: readonly number[] = [10, 6];

type OutlineStyle = 'solid' | 'dashDot' | 'scallop' | 'dots' | 'icing';

function areaColor(input: PainterInput, role: MetocColor = input.spec.colors[0]): string {
    const {spec, props} = input;
    if (spec.operatorColor && props.color) return props.color;
    return colorOf(role);
}

/** The ring as a closed polyline. */
const ringOf = (w: PathWalker): P[] => w.slice(0, w.length);

/** The smaller side of the ring's bounding box, in pixels: the size labels are measured against. */
function areaSizePx(ring: readonly P[], res: number): number {
    const [x0, y0, x1, y1] = boundsOf(ring);
    return Math.min(x1 - x0, y1 - y0) / res;
}

/**
 * A point well inside the ring: the centroid when it is inside, else the middle of the longest
 * stretch of the horizontal line through the centroid that lies inside (a crescent's centroid is
 * outside it).
 */
export function interiorPoint(ring: readonly P[]): P {
    const c = ringCentroid(ring);
    if (pointInRing(c, ring)) return c;
    const xs: number[] = [];
    for (let i = 0; i < ring.length - 1; i++) {
        const [a, b] = [ring[i], ring[i + 1]];
        if (a[1] > c[1] !== b[1] > c[1]) xs.push(a[0] + ((c[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
    }
    xs.sort((p, q) => p - q);
    let best: P = c;
    let widest = -1;
    for (let i = 0; i + 1 < xs.length; i += 2) {
        if (xs[i + 1] - xs[i] > widest) {
            widest = xs[i + 1] - xs[i];
            best = [(xs[i] + xs[i + 1]) / 2, c[1]];
        }
    }
    return best;
}

/** The outline marks, before labels. `gaps` are stretches along the ring left open for a label. */
function outline(input: PainterInput, style: OutlineStyle, color: string, gaps: [number, number][]): Paint[] {
    const {walker: w, resolution: res, props} = input;
    const lineMark = (coordinates: P[], dashPx?: readonly number[]): Paint => ({
        role: 'line',
        geometry: {type: 'LineString', coordinates},
        stroke: {color, widthPx: lineWidth(), ...(dashPx ? {dashPx} : {})},
    });
    const runs = () => (gaps.length ? runsOutside(w, gaps) : [ringOf(w)]);
    const sizePx = pipSize();

    switch (style) {
        case 'solid':
            return runs().map((r) => lineMark(r, props.dashed && input.spec.operatorDash ? DASHED : undefined));
        case 'dashDot':
            return runs().map((r) => lineMark(r, DASH_DOT));
        case 'scallop': {
            // MVFR: half-circles bulging outward all the way round.
            const spacingPx = sizePx * 1.6;
            const fit = decorationFit(w.length / res, spacingPx, sizePx, 4);
            if (fit === 0) return runs().map((r) => lineMark(r));
            const slots = evenSlots(w.length, spacingPx * fit * res);
            const side = outwardSide(w.path);
            const pts: P[] = [];
            for (let i = 0; i < slots.count; i++) pts.push(...arcOver(w, i * slots.spacing, (i + 1) * slots.spacing, side).slice(i === 0 ? 0 : 1));
            return [lineMark(pts)];
        }
        case 'dots': {
            // Turbulence: a ring of dots and no line.
            const spacingPx = sizePx * 1.3;
            const fit = decorationFit(w.length / res, spacingPx, sizePx, 4);
            if (fit === 0) return runs().map((r) => lineMark(r));
            const slots = evenSlots(w.length, spacingPx * fit * res);
            const r = sizePx * 0.28 * fit * res;
            const out: Paint[] = [];
            for (let i = 0; i < slots.count; i++) {
                out.push({role: 'decoration', geometry: {type: 'Polygon', coordinates: [circleRing(w.at(i * slots.spacing).point, r)]}, fill: {color}});
            }
            return out;
        }
        case 'icing': {
            // Icing: dashes, each with a tick pointing into the area.
            const dashPx = sizePx * 1.8;
            const gapPx = sizePx * 0.7;
            const fit = decorationFit(w.length / res, dashPx + gapPx, sizePx, 4);
            if (fit === 0) return runs().map((r) => lineMark(r));
            const slots = evenSlots(w.length, (dashPx + gapPx) * fit * res);
            const dash = dashPx * fit * res;
            const tick = sizePx * 0.7 * fit * res;
            const inward = -outwardSide(w.path);
            const out: Paint[] = [];
            for (let i = 0; i < slots.count; i++) {
                const from = i * slots.spacing;
                out.push(lineMark(w.slice(from, from + dash)));
                const {point, dir} = w.at(from + dash / 2);
                out.push({
                    role: 'decoration',
                    geometry: {type: 'LineString', coordinates: [point, offset(point, dir, 0, inward * tick)]},
                    stroke: {color, widthPx: lineWidth()},
                });
            }
            return out;
        }
    }
}

/** The label size for a text of `text` at most `share` of `limitPx`, or 0 when unreadable. */
function cappedLabelSize(text: string, limitPx: number, share: number): number {
    const cfg = getMetocConfig();
    const size = Math.min(cfg.labelSize, (limitPx * share) / Math.max(1, estimateTextWidth(text, 1)));
    return size >= MIN_LABEL_PX ? size : 0;
}

/** A centred label inside the ring, fitted to it. */
function centredLabel(ring: readonly P[], text: string, color: string, res: number): Paint[] {
    const cfg = getMetocConfig();
    const sizePx = areaSizePx(ring, res);
    let size = Math.min(cfg.labelSize, (sizePx * AREA_LABEL_SHARE) / 1.2);
    const at = interiorPoint(ring);
    const halfW = (estimateTextWidth(text, size) / 2 + 2) * res;
    const halfH = ((size * 1.3) / 2) * res;
    size *= fitScaleInRing(at, halfW, halfH, ring);
    if (size < MIN_LABEL_PX) return [];
    return [{role: 'label', geometry: {type: 'Point', coordinates: at}, text: {text, color, sizePx: size, haloColor: cfg.labelHalo, rotation: 0}}];
}

/** Where on the ring a label on the outline goes: its topmost point, so it reads at the top. */
function topmostDistance(w: PathWalker): number {
    let best = 0;
    let top = -Infinity;
    const steps = 64;
    for (let i = 0; i < steps; i++) {
        const d = (w.length * i) / steps;
        const y = w.at(d).point[1];
        if (y > top) {
            top = y;
            best = d;
        }
    }
    return best;
}

/** An area painter with one outline style; the freeform area also writes its value inside. */
function area(style: OutlineStyle): Painter {
    return (input) => {
        const {walker: w, resolution: res, props, spec} = input;
        const color = areaColor(input);
        const ring = ringOf(w);
        const paints: Paint[] = [];
        if (props.filled && spec.drawRule === 'Area2') {
            paints.push({role: 'decoration', geometry: {type: 'Polygon', coordinates: [ring]}, fill: {color, opacity: getMetocConfig().areaFillOpacity}});
        } else {
            paints.push(...outline(input, style, color, []));
        }
        const value = props.value?.trim();
        if (value && spec.valueField) paints.push(...centredLabel(ring, value, color, res));
        return paints;
    };
}

/**
 * The tropical storm wind area: a solid outline in its radius's colour, its value (the wind
 * radius) on the outline at the top, and the boxed date-time label off the upper-left with a
 * leader to the storm's centre, as Table M-II draws it.
 */
const tropicalStormWindArea: Painter = (input) => {
    const {walker: w, resolution: res, props} = input;
    const cfg = getMetocConfig();
    const color = areaColor(input);
    const ring = ringOf(w);
    const graphicPx = areaSizePx(ring, res);
    const paints: Paint[] = [];

    const value = props.value?.trim();
    const gaps: [number, number][] = [];
    let valueLabel: Paint | undefined;
    if (value) {
        const size = cappedLabelSize(value, graphicPx, 0.8);
        if (size > 0) {
            const at = topmostDistance(w);
            const half = (estimateTextWidth(value, size) / 2 + 4) * res;
            if (w.length > half * 4) {
                gaps.push([at - half, at + half]);
                // A gap that runs past the seam is split in two, so the ring stays open there only.
                if (at - half < 0) gaps.push([w.length + (at - half), w.length]);
                if (at + half > w.length) gaps.push([0, at + half - w.length]);
                const {point, dir} = w.at(at);
                valueLabel = {
                    role: 'label',
                    geometry: {type: 'Point', coordinates: point},
                    text: {text: value, color, sizePx: size, haloColor: cfg.labelHalo, rotation: uprightAngle(dir)},
                };
            }
        }
    }
    paints.push(...outline(input, 'solid', color, gaps));
    if (valueLabel) paints.push(valueLabel);

    const dtg = props.dtg?.trim();
    if (dtg) {
        const size = cappedLabelSize(dtg, graphicPx, OUTSIDE_LABEL_SHARE * 4);
        if (size > 0) {
            const [x0, , , y1] = boundsOf(ring);
            const halfW = (estimateTextWidth(dtg, size) / 2 + 4) * res;
            const halfH = (size * 0.75 + 3) * res;
            const gap = 6 * res;
            const box: P = [x0 - gap - halfW, y1 + gap + halfH];
            const centre = interiorPoint(ring);
            const corner: P = [box[0] + halfW, box[1] - halfH];
            paints.push({role: 'decoration', geometry: {type: 'LineString', coordinates: [corner, centre]}, stroke: {color: colorOf('black'), widthPx: 1}});
            paints.push({
                role: 'label',
                geometry: {type: 'Point', coordinates: box},
                // The box takes the label halo as its background, so a host's dark palette (light
                // "black", dark halo) gives a dark box with light text, never light-on-white.
                text: {text: dtg, color: colorOf('black'), sizePx: size, haloColor: cfg.labelHalo, rotation: 0, boxColor: colorOf('black')},
            });
        }
    }
    return paints;
};

export const AREA_PAINTERS: Record<string, Painter> = {
    tropicalStormWindArea,
    solid: area('solid'),
    dashDot: area('dashDot'),
    scallop: area('scallop'),
    dots: area('dots'),
    icing: area('icing'),
};

// ── the inter-tropical convergence zone (Table M-I, Line5) ─────────────────────

/**
 * The band's long axis: the principal axis of its outline, and the outline's extent along it.
 * The rails are the band's two long sides, found by walking the axis and taking, at each step,
 * the outline's furthest crossings either side — so a band traced "slightly wider at the western
 * end" (Line5) draws its rails apart there, without the operator drawing the rails themselves.
 */
export function bandAxis(ring: readonly P[]): {centre: P; axis: P; normal: P; from: number; to: number} {
    const c = ringCentroid(ring);
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (const p of ring) {
        const dx = p[0] - c[0];
        const dy = p[1] - c[1];
        sxx += dx * dx;
        syy += dy * dy;
        sxy += dx * dy;
    }
    const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const axis: P = [Math.cos(angle), Math.sin(angle)];
    const normal: P = [-axis[1], axis[0]];
    const ts = ring.map((p) => (p[0] - c[0]) * axis[0] + (p[1] - c[1]) * axis[1]);
    return {centre: c, axis, normal, from: Math.min(...ts), to: Math.max(...ts)};
}

/** Where the line through `p` along `dir` crosses the ring, as distances along `dir`. */
function crossings(p: P, dir: P, ring: readonly P[]): number[] {
    const out: number[] = [];
    for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i];
        const b = ring[i + 1];
        const ex = b[0] - a[0];
        const ey = b[1] - a[1];
        const den = dir[0] * ey - dir[1] * ex;
        if (Math.abs(den) < 1e-12) continue;
        const wx = a[0] - p[0];
        const wy = a[1] - p[1];
        const s = (wx * ey - wy * ex) / den;
        const t = (wx * dir[1] - wy * dir[0]) / den;
        if (t >= 0 && t <= 1) out.push(s);
    }
    return out;
}

/** The convergence zone: two rails along the band's long sides, joined by rungs in groups of two and three. */
const convergenceZone: Painter = (input) => {
    const {walker: w, resolution: res} = input;
    const ring = ringOf(w);
    const color = areaColor(input);
    const {centre, axis, normal, from, to} = bandAxis(ring);
    const stepM = 3 * res;
    const tops: P[] = [];
    const bottoms: P[] = [];
    const samples: {t: number; top: P; bottom: P}[] = [];
    const inset = Math.min(stepM, (to - from) / 4);
    const steps = Math.max(2, Math.ceil((to - from - 2 * inset) / stepM));
    for (let i = 0; i <= steps; i++) {
        const t = from + inset + ((to - from - 2 * inset) * i) / steps;
        const p: P = [centre[0] + axis[0] * t, centre[1] + axis[1] * t];
        const ks = crossings(p, normal, ring);
        if (ks.length < 2) continue;
        const hi = Math.max(...ks);
        const lo = Math.min(...ks);
        const top: P = [p[0] + normal[0] * hi, p[1] + normal[1] * hi];
        const bottom: P = [p[0] + normal[0] * lo, p[1] + normal[1] * lo];
        tops.push(top);
        bottoms.push(bottom);
        samples.push({t, top, bottom});
    }
    if (samples.length < 2) return outline(input, 'solid', color, []);
    const rail = (coordinates: P[]): Paint => ({role: 'line', geometry: {type: 'LineString', coordinates}, stroke: {color, widthPx: lineWidth()}});
    const paints: Paint[] = [rail(tops), rail(bottoms)];

    // Rungs: a pair, a gap, a triple, a gap — repeated along the band, screen-sized.
    const sizePx = pipSize();
    const periodM = sizePx * 7 * res;
    const offsets = [0, 0.6, 3.5, 4.1, 4.7].map((k) => k * sizePx * res);
    const length = samples[samples.length - 1].t - samples[0].t;
    const slots = evenSlots(length, periodM);
    const rungAt = (t: number) => {
        // The sample nearest t: rungs follow the rails' own spacing, so they always meet them. The
        // samples are in order along the axis, so a binary search: a scan per rung would make the
        // band quadratic in the zoom.
        let lo = 0;
        let hi = samples.length - 1;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (samples[mid].t < t) lo = mid;
            else hi = mid;
        }
        return Math.abs(samples[hi].t - t) < Math.abs(samples[lo].t - t) ? samples[hi] : samples[lo];
    };
    for (let i = 0; i < slots.count; i++) {
        const base = samples[0].t + i * slots.spacing + slots.spacing * 0.2;
        for (const off of offsets) {
            const t = base + off;
            if (t > samples[samples.length - 1].t) continue;
            const s = rungAt(t);
            paints.push({role: 'decoration', geometry: {type: 'LineString', coordinates: [s.bottom, s.top]}, stroke: {color, widthPx: lineWidth()}});
        }
    }
    return paints;
};

AREA_PAINTERS.convergenceZone = convergenceZone;
