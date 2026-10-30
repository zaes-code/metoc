/**
 * # Glyphs, in METOC colours
 *
 * The glyph format and its painter are the engine's (`@zaes/symbology-engine`). This binds them to
 * the METOC palette: a glyph's colour roles resolve through {@link colorOf} and its halo is the
 * configured label halo, read at each paint so a host's palette change reaches the next frame.
 */

import {GLYPH_PX, paintGlyph as paintEngineGlyph, parsePath, resolveGlyphColor as resolveEngineGlyphColor, type GlyphColors, type GlyphPlacement, type Paint} from '@zaes/symbology-engine';
import {colorOf, getMetocConfig} from '../core/config.js';
import type {GlyphColor, GlyphDef, MetocColor} from '../core/specTypes.js';

export {GLYPH_PX, parsePath};

/** The METOC palette as the engine wants it. */
export function metocGlyphColors(): GlyphColors {
    return {resolve: (c) => colorOf(c as MetocColor), halo: getMetocConfig().labelHalo};
}

export function resolveGlyphColor(c: GlyphColor | undefined, main: string): string | undefined {
    return resolveEngineGlyphColor(c, main, metocGlyphColors());
}

/** The marks for a glyph at a placement, in METOC colours. */
export function paintGlyph(glyph: GlyphDef, place: Omit<GlyphPlacement, 'colors'>): Paint[] {
    return paintEngineGlyph(glyph, {...place, colors: metocGlyphColors()});
}
