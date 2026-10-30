/**
 * Picker thumbnails, drawn by the paint layer itself so a thumbnail can never disagree with the
 * map. Generated on demand: a few hundred bytes of SVG per call, nothing shipped pre-rendered.
 */

import {getMetocSpec, type MetocGraphicName} from '../core/catalog.js';
import type {ProjectedPosition} from '@zaes/symbology-engine';
import {paintMetocPath} from '../core/render.js';
import type {MetocProperties} from '../core/types.js';

export interface ThumbnailOptions {
    width?: number;
    height?: number;
    /** Decoration size relative to the map's, so pips fit a small picture. */
    scale?: number;
    /** A value to show on an isopleth. */
    value?: string;
    /**
     * A graphic's own properties to draw it with (its colour, dash, fill, value, wind), so a
     * properties panel can show the selected graphic as it is. Its size is left out: a preview is
     * one size for every graphic, as the picker's thumbnails are.
     */
    properties?: Omit<Partial<MetocProperties>, 'name' | 'size'>;
}

const ESCAPES: Record<string, string> = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESCAPES[c]);
const num = (n: number) => (Math.round(n * 100) / 100).toString();

/**
 * An SVG of the graphic: a line on a gentle curve, drawn right to left as Table M-II draws it so a
 * front's pips hang below it, or an area as a rounded outline filling the picture's middle.
 */
export function metocThumbnailSvg(name: MetocGraphicName, options: ThumbnailOptions = {}): string {
    const width = options.width ?? 120;
    const height = options.height ?? 40;
    const resolution = options.scale ?? 0.7;
    const midY = height * 0.55;
    // Projected y is up; the picture's y is down. Build in y-up and flip on the way out.
    const kind = getMetocSpec(name).geometry;
    const path: ProjectedPosition[] =
        kind === 'point'
            ? // The wind barb's station sits low right, so a westerly shaft has room to the left.
              [name === 'StationPlot' ? [width * 0.5, height * 0.4] : getMetocSpec(name).directional ? [width * 0.7, height * 0.35] : [width / 2, height / 2]]
            : kind === 'area'
            ? [
                  [width * 0.18, height * 0.5],
                  [width * 0.3, height * 0.2],
                  [width * 0.7, height * 0.18],
                  [width * 0.84, height * 0.5],
                  [width * 0.68, height * 0.82],
                  [width * 0.5, height * 0.62],
                  [width * 0.3, height * 0.8],
              ]
            : (() => {
                  // An isopleth writes its value beyond each end: leave room for it in the picture.
                  const inset = options.value && getMetocSpec(name).valueField ? 8 + options.value.length * 7 : 8;
                  return [
                      [width - inset, midY],
                      [width * 0.5, midY + height * 0.12],
                      [inset, midY],
                  ] as ProjectedPosition[];
              })();
    // A barb with no wind is only its plot circle; the picture shows one blowing.
    // A station plot shows a whole sample station: scattered cloud, moderate rain, 24/18, 1013.2 hPa, rising 1.9.
    const sample =
        name === 'StationPlot'
            ? ({windDirection: 290, windSpeed: 25, cloudCover: 'CloudScattered', temperature: 24, dewPoint: 18, pressure: 1013.2, pressureChange: 1.9, pressureTendency: 'PressureRiseThenSteady', weather: 'RainContinuousModerate'} as Partial<MetocProperties>)
            : getMetocSpec(name).directional
              ? {windDirection: 290, windSpeed: 65}
              : {};
    // A graphic that carries a value shows its placeholder, so a sounding is a number, not nothing.
    // (A point's value hangs outside its glyph, past a thumbnail's edge, so a point shows none.)
    const value = options.value ?? (kind === 'point' && !getMetocSpec(name).glyph ? undefined : getMetocSpec(name).valueField?.placeholder);
    const own = options.properties ?? {};
    const shown = own.value?.trim() ? own.value : value;
    const paints = paintMetocPath({name, ...sample, ...own, ...(shown ? {value: shown} : {})}, path, {resolution});
    const pt = (p: readonly number[]) => `${num(p[0])},${num(height - p[1])}`;
    const parts: string[] = [];
    for (const p of paints) {
        const dash = p.stroke?.dashPx ? ` stroke-dasharray="${p.stroke.dashPx.map((d) => num(d * resolution)).join(' ')}"` : '';
        const stroke = p.stroke
            ? ` stroke="${p.stroke.color}" stroke-width="${num(p.stroke.widthPx * resolution)}" stroke-linecap="round" stroke-linejoin="round"${dash}`
            : ' stroke="none"';
        if (p.geometry.type === 'LineString') {
            parts.push(`<polyline points="${p.geometry.coordinates.map(pt).join(' ')}" fill="none"${stroke}/>`);
        } else if (p.geometry.type === 'Polygon') {
            const opacity = p.fill?.opacity !== undefined ? ` fill-opacity="${num(p.fill.opacity)}"` : '';
            parts.push(`<polygon points="${p.geometry.coordinates[0].map(pt).join(' ')}" fill="${p.fill?.color ?? 'none'}"${opacity}${stroke}/>`);
        } else if (p.text) {
            const x = p.geometry.coordinates[0];
            const y = height - p.geometry.coordinates[1];
            const deg = (-p.text.rotation * 180) / Math.PI;
            parts.push(
                `<text x="${num(x)}" y="${num(y)}" transform="rotate(${num(deg)} ${num(x)} ${num(y)})" font-family="sans-serif" ` +
                    `font-size="${num(p.text.sizePx * resolution)}" text-anchor="middle" dominant-baseline="central" fill="${p.text.color}">${esc(p.text.text)}</text>`,
            );
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
}
