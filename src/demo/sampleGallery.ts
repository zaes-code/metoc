/**
 * The sample gallery: every graphic drawn once, in a grid filling the current view, so a change to
 * any symbol is visible at a glance on both engines. Lines are gentle curves drawn right to left,
 * as Table M-II draws them, so the pips hang below the line as in the standard; areas are an
 * irregular, slightly concave outline, the shape a traced area really has. Not published.
 */

import {
    MetocCategory,
    getMetocSpec,
    listMetocGraphics,
    metocFeature,
    type MetocCollection,
    type MetocGraphicName,
    type MetocProperties,
    type ViewAdapter,
} from '@zaes/metoc';

/** Plausible values, so the labels show. */
const SAMPLE_PROPS: Partial<Record<MetocGraphicName, Omit<MetocProperties, 'name'>>> = {
    IsobarSurface: {value: '1012'},
    ContourUpperAir: {value: '564'},
    Isotherm: {value: '-10'},
    Isotach: {value: '50'},
    Isodrosotherm: {value: '15'},
    Thickness: {value: '540'},
    OperatorDefinedFreeformLine: {value: 'A'},
    TropicalStormWindArea: {value: '34 KT', dtg: '221800Z'},
    LowPressureCenter: {value: '998'},
    HighPressureCenter: {value: '1016'},
    TropopauseLow: {value: '270'},
    TropopauseHigh: {value: '460'},
    WindBarb: {windDirection: 270, windSpeed: 65},
    OperatorDefinedFreeformArea: {value: 'AREA A'},
} as Partial<Record<MetocGraphicName, Omit<MetocProperties, 'name'>>>;

/** An irregular outline around a cell's centre, as fractions of its half-size: a concave notch on top. */
const BLOB: readonly [number, number][] = [
    [-0.9, 0.1],
    [-0.55, -0.75],
    [0.35, -0.85],
    [0.92, -0.2],
    [0.7, 0.7],
    [0.25, 0.85],
    [0.05, 0.25],
    [-0.4, 0.8],
];

export function drawSampleGallery(collection: MetocCollection, view: ViewAdapter, size: [number, number], names: MetocGraphicName[] = listMetocGraphics()): string[] {
    // Columns for the screen, and enough of them that the rows fit.
    let cols = size[0] > 1100 ? 7 : size[0] > 800 ? 6 : size[0] > 520 ? 4 : 3;
    while (cols < 12 && Math.ceil(names.length / cols) * 70 > size[1]) cols++;
    const rows = Math.ceil(names.length / cols);
    const marginX = 30;
    const marginY = 40;
    const cellW = (size[0] - marginX * 2) / cols;
    const cellH = (size[1] - marginY * 2) / rows;
    const ids: string[] = [];
    names.forEach((name, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x0 = marginX + col * cellW;
        const y0 = marginY + row * cellH;
        const spec = getMetocSpec(name);
        const props = SAMPLE_PROPS[name] ?? {};
        let pixels: [number, number][];
        if (spec.geometry === 'point') {
            pixels = [[x0 + cellW / 2, y0 + cellH * 0.5]];
        } else if (name === 'InterTropicalConvergenceZone') {
            // A band, "slightly wider at the western end" (Table M-I, Line5).
            const l = x0 + cellW * 0.1;
            const r = x0 + cellW * 0.9;
            const m = y0 + cellH * 0.5;
            const h = Math.min(cellH * 0.22, 16);
            pixels = [
                [l, m - h],
                [(l + r) / 2, m - h * 0.75 - 4],
                [r, m - h * 0.55],
                [r, m + h * 0.55],
                [(l + r) / 2, m + h * 0.75 - 4],
                [l, m + h],
            ];
        } else if (spec.geometry === 'area') {
            const cx = x0 + cellW / 2;
            const cy = y0 + cellH * 0.55;
            const rx = cellW * 0.32;
            const ry = cellH * 0.32;
            pixels = BLOB.map(([fx, fy]) => [cx + fx * rx, cy + fy * ry]);
        } else {
            // Isopleths write their value beyond each end, so leave room before the next cell.
            const inset = spec.valueField ? 0.2 : 0.12;
            const right = x0 + cellW * (1 - inset);
            const left = x0 + cellW * inset;
            const mid = y0 + cellH * 0.5;
            const sag = Math.min(cellH * 0.18, 14);
            pixels = [
                [right, mid],
                [(left + right) / 2, mid - sag],
                [left, mid],
            ];
        }
        ids.push(collection.add(metocFeature(name, pixels.map((p) => view.toLonLat(p)), props)));
    });
    return ids;
}

/** The picker's groups, in the standard's order. */
export const CATEGORY_ORDER: MetocCategory[] = Object.values(MetocCategory);
