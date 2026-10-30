/**
 * # Painters for graphics drawn from data
 *
 * A catalog entry with a {@link GlyphDef}, {@link LineStyleDef} or {@link AreaStyleDef} needs no
 * painter of its own: these three draw it. The line and area painters are the engine's
 * (`paintLineStyle`, `paintAreaStyle`); this decides what METOC decides about a graphic — its main
 * colour (the operator's where the standard allows one), an operator's Area2 fill and dash, its
 * value written in the middle — and hands the engine METOC's palette, line width and label style.
 */

import {paintAreaStyle, paintLineStyle, type StyleContext} from '@zaes/symbology-engine';
import {getMetocConfig, lineWidth} from '../core/config.js';
import type {AreaStyleDef, LineStyleDef} from '../core/specTypes.js';
import {metocGlyphColors, paintGlyph, resolveGlyphColor} from './glyph.js';
import type {Painter, PainterInput} from './paints.js';

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

/** A point drawn as its icon. */
export const glyphPainter: Painter = (input) => {
    const glyph = input.spec.glyph;
    if (!glyph) return [];
    return paintGlyph(glyph, {at: input.walker.path[0], resolution: input.resolution, main: mainColorOf(input), value: input.props.value});
};

/** A plain line, with its decorations. */
export const lineStylePainter: Painter = (input) => paintLineStyle(input.spec.lineStyle as LineStyleDef, styleContext(input));

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
