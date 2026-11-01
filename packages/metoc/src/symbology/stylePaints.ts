/**
 * # Painters for graphics drawn from data
 *
 * A catalog entry with a {@link GlyphDef}, {@link LineStyleDef} or {@link AreaStyleDef} needs no
 * painter of its own: these three draw it. The line and area painters are the engine's
 * (`paintLineStyle`, `paintAreaStyle`); this decides what METOC decides about a graphic — its main
 * colour (the operator's where the standard allows one), an operator's Area2 fill and dash, its
 * value written in the middle — and hands the engine METOC's palette, line width and label style.
 */

import {offset, paintAreaStyle, paintLineStyle, type Paint, type StyleContext} from '@zaes/symbology-engine';
import {getMetocConfig, lineWidth} from '../core/config.js';
import type {AreaStyleDef, LineDecoration, LineStyleDef} from '../core/specTypes.js';
import {metocGlyphColors, paintGlyph, resolveGlyphColor} from './glyph.js';
import type {Painter, PainterInput} from './paints.js';
import {fitValueBox} from './values.js';

/** The graphic's main colour, honouring an operator's choice where the standard allows one. */
export function mainColorOf(input: PainterInput): string {
    const {spec, props} = input;
    if (spec.operatorColor && props.color) return props.color;
    return resolveGlyphColor(spec.colors[0], '') ?? 'black';
}

/** What the engine's style painters draw with, for one METOC graphic. */
function styleContext(input: PainterInput): StyleContext {
    const cfg = getMetocConfig();
    return {walker: input.walker, resolution: input.resolution, main: mainColorOf(input), colors: metocGlyphColors(), lineWidth: lineWidth(), label: {size: cfg.labelSize, halo: cfg.labelHalo}};
}

/** A point drawn as its icon, a boxed value's box widened to hold it. */
export const glyphPainter: Painter = (input) => {
    const glyph = input.spec.glyph;
    if (!glyph) return [];
    const value = input.props.value;
    return paintGlyph(fitValueBox(glyph, value), {at: input.walker.path[0], resolution: input.resolution, main: mainColorOf(input), value});
};

/** A plain line, with its decorations; an arrow's feathers drawn as Table M-III draws a current's. */
export const lineStylePainter: Painter = (input) => {
    const style = input.spec.lineStyle as LineStyleDef;
    const ctx = styleContext(input);
    const arrow = style.decorations?.find((d): d is Extract<LineDecoration, {kind: 'arrow'}> => d.kind === 'arrow' && (d.feathers ?? 0) > 0);
    if (!arrow) return paintLineStyle(style, ctx);
    const bare = {...style, decorations: style.decorations!.map((d) => (d === arrow ? {...arrow, feathers: 0} : d))};
    return [...paintLineStyle(bare, ctx), ...feathers(arrow, style.widthPx ?? ctx.lineWidth, ctx)];
};

/**
 * A current's feathers at the tail of its arrow: each feather a pair of parallel strokes on the
 * right of the flow, slanting back from the shaft to the tail, the last stroke ending level with
 * the tail, as Table M-III draws the flood current ("arrow with one feather"). Sized from the
 * arrowhead, so they keep the drawing's proportions.
 */
function feathers(arrow: Extract<LineDecoration, {kind: 'arrow'}>, widthPx: number, ctx: StyleContext): Paint[] {
    const {walker: w, resolution: res, main} = ctx;
    const size = (arrow.sizePx ?? 10) * res;
    const out: Paint[] = [];
    for (let k = 0; k < (arrow.feathers ?? 0); k++) {
        for (const start of [0.6, 1.3]) {
            const d = (start + k * 1.6) * size;
            if (d > w.length) continue;
            const {point, dir} = w.at(d);
            out.push({role: 'decoration', geometry: {type: 'LineString', coordinates: [point, offset(point, dir, -size * 0.6, -size * 0.65)]}, stroke: {color: main, widthPx}});
        }
    }
    return out;
}

/** A plain area: fill, outline, pattern, dots, outline glyphs and centred text. */
export const areaStylePainter: Painter = (input) => {
    const {spec, props} = input;
    return paintAreaStyle(spec.areaStyle as AreaStyleDef, styleContext(input), {
        // Area2: colour-filled with no outer boundary line, when the operator asks for it.
        filled: props.filled && spec.drawRule === 'Area2' ? {opacity: getMetocConfig().areaFillOpacity} : undefined,
        dash: props.dashed && spec.operatorDash ? [10, 6] : undefined,
        text: spec.valueField ? props.value?.trim() : undefined,
    });
};
