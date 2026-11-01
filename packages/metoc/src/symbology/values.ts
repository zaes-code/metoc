/**
 * # Values as drawn
 *
 * What a graphic's value looks like on the map, as opposed to what was typed: Table M-II writes the
 * heights of turbulence, icing and the tropopause as "X in 3 digits", hundreds of feet, so a bare
 * height of one or two digits is drawn padded (25 → 025). The stored value is left as given. A
 * pressure centre's pressure is "three or four digits" as it stands, and is drawn as given.
 *
 * And how a boxed value fits its box: a glyph whose value is written inside a drawn box (the
 * tropopause level, the freezing level, ice thickness) widens the box to the text, so a longer
 * value never runs over its outline.
 */

import {estimateTextWidth, parsePath} from '@zaes/symbology-engine';
import {MetocCategory, MetocGraphicName as N, type MetocGraphicSpec} from '../core/catalog.js';
import type {GlyphDef, GlyphPart} from '../core/specTypes.js';
import type {MetocProperties} from '../core/types.js';

/** The graphics whose value is a height Table M-II writes "in 3 digits". */
function isThreeDigitHeight(spec: MetocGraphicSpec): boolean {
    if (spec.category === MetocCategory.TurbulenceIcing && spec.geometry === 'point') return true;
    return spec.name === N.TropopauseLow || spec.name === N.TropopauseHigh || spec.name === N.TropopauseLevel;
}

/** A value as the graphic draws it: a bare one- or two-digit height padded to three digits where the standard asks for three. */
export function displayedValue(spec: MetocGraphicSpec, value: string | undefined): string | undefined {
    if (value === undefined) return undefined;
    const v = value.trim();
    return isThreeDigitHeight(spec) && /^\d{1,2}$/.test(v) ? v.padStart(3, '0') : value;
}

/** The properties a painter draws: the same, with the value as drawn. */
export function withDisplayedValue(spec: MetocGraphicSpec, props: MetocProperties): MetocProperties {
    const value = displayedValue(spec, props.value);
    return value === props.value ? props : {...props, value};
}

type TextPart = Extract<GlyphPart, {text: string}>;
type PathPart = Extract<GlyphPart, {d: string}>;

/** Space between texts sharing the value's row, as a share of their size. */
const ROW_GAP = 0.3;
/** Space between the text and the box's stroke, in glyph units. */
const BOX_PAD = 1.4;

/** An axis-aligned rectangle drawn as one closed path, as [x0, y0, x1, y1] in glyph units. */
function rectangleOf(part: PathPart): [number, number, number, number] | undefined {
    const subs = parsePath(part.d);
    if (subs.length !== 1 || !subs[0].closed) return undefined;
    const pts = subs[0].points;
    if (pts.length !== 5) return undefined;
    for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]];
        if (a[0] !== b[0] && a[1] !== b[1]) return undefined;
    }
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/**
 * The glyph with its value's box widened to hold the value. The texts on the value's row (the
 * freezing level's "0°:" and its height) are laid out across the box's middle with a gap between
 * them, and the box grows about its centre when they need more room than it has; it never shrinks.
 * A glyph with no box round its value, or no value, is returned as it is.
 */
export function fitValueBox(glyph: GlyphDef, value: string | undefined): GlyphDef {
    const v = value?.trim();
    const valuePart = glyph.parts.find((p): p is TextPart => 'text' in p && p.text === '$value');
    if (!v || !valuePart) return glyph;
    let boxIndex = -1;
    let box: [number, number, number, number] | undefined;
    glyph.parts.forEach((p, i) => {
        if (box || !('d' in p)) return;
        const r = rectangleOf(p);
        if (r && r[0] < valuePart.x && valuePart.x < r[2] && r[1] < valuePart.y && valuePart.y < r[3]) {
            box = r;
            boxIndex = i;
        }
    });
    if (!box) return glyph;
    const [x0, y0, x1, y1] = box;
    const boxPart = glyph.parts[boxIndex] as PathPart;

    const row = glyph.parts.map((p, i) => ({p, i})).filter((e): e is {p: TextPart; i: number} => 'text' in e.p && Math.abs(e.p.y - valuePart.y) < 0.5 && e.p.x > x0 && e.p.x < x1);
    row.sort((a, b) => a.p.x - b.p.x);
    const widths = row.map(({p}) => estimateTextWidth(p.text === '$value' ? v : p.text, p.size));
    const gaps = row.slice(1).map(({p}) => p.size * ROW_GAP);
    const rowWidth = widths.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
    const cx = (x0 + x1) / 2;
    const half = Math.max((x1 - x0) / 2, rowWidth / 2 + BOX_PAD + (boxPart.width ?? 1.6) / 2);

    const parts = [...glyph.parts];
    parts[boxIndex] = {...boxPart, d: `M${cx - half} ${y0}H${cx + half}V${y1}H${cx - half}Z`};
    let x = cx - rowWidth / 2;
    row.forEach(({p, i}, k) => {
        parts[i] = {...p, x: x + widths[k] / 2};
        x += widths[k] + (gaps[k] ?? 0);
    });
    return {...glyph, parts};
}
