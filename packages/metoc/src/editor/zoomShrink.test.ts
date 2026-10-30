import {MetocGraphicName as N, MetocCollection, configureMetoc, fromMercator, getMetocConfig, metocFeature, paintMetocGraphic, resetMetocConfig, toMercator} from '../index.js';
import {MetocInteraction, type Pixel, type ViewAdapter} from './interaction';

afterEach(() => resetMetocConfig());

// 1:1,000,000 at 96 pixels an inch is about 264.6 meters a pixel.
const RES_1M = 1_000_000 / (96 / 0.0254);
const high = metocFeature(N.HighPressureCenter, [[0, 0]], {value: '1032'});
/** The H's size in pixels, painted at a resolution. */
const letterPx = (resolution: number) => paintMetocGraphic(high, {resolution}).find((p) => p.text?.text === 'H')!.text!.sizePx;

describe('point symbols shrinking as the map zooms out', () => {
    it('is off by default: a symbol keeps its size at every zoom', () => {
        expect(letterPx(RES_1M * 16)).toBe(letterPx(RES_1M));
    });

    it('draws full size up to the configured scale, then smaller, never below the minimum', () => {
        configureMetoc({pointFullSizeScale: 1_000_000});
        const full = letterPx(RES_1M);
        expect(letterPx(RES_1M / 4)).toBe(full);
        expect(letterPx(RES_1M * 4)).toBeCloseTo(full * 0.5);
        expect(letterPx(RES_1M * 100)).toBeCloseTo(full * 0.4);
        configureMetoc({pointMinScale: 0.2});
        expect(letterPx(RES_1M * 100)).toBeCloseTo(full * 0.2);
    });

    it('leaves lines and areas alone', () => {
        configureMetoc({pointFullSizeScale: 1_000_000});
        const front = metocFeature(N.ColdFront, [[-10, 0], [0, 2], [10, 0]]);
        // Zoomed out, fewer pips fit the shorter line; the line and each pip keep their pixel size.
        const line = (r: number) => paintMetocGraphic(front, {resolution: r}).find((p) => p.role === 'line')!.stroke!.widthPx;
        expect(line(RES_1M * 16)).toBe(line(RES_1M));
    });

    it('clamps its settings, and undefined turns the shrink off', () => {
        configureMetoc({pointFullSizeScale: 5, pointMinScale: 3});
        expect(getMetocConfig()).toMatchObject({pointFullSizeScale: 1_000, pointMinScale: 1});
        configureMetoc({pointFullSizeScale: undefined});
        expect('pointFullSizeScale' in getMetocConfig()).toBe(false);
    });
});

describe('editing a shrunk point symbol', () => {
    // A view zoomed out to 1:4,000,000 with symbols full size at 1:1,000,000: drawn at half size.
    const RES = RES_1M * 4;
    const view: ViewAdapter = {
        toPixel: (ll) => {
            const m = toMercator(ll);
            return [m[0] / RES, -m[1] / RES];
        },
        toLonLat: (px) => fromMercator([px[0] * RES, -px[1] * RES]),
    };
    const at = (x: number, y: number) => ({pixel: [x, y] as Pixel});
    const px = (ll: readonly number[]) => view.toPixel(ll as [number, number]).map((v) => Math.round(v));

    it('puts the resize handle at the drawn size, and a drag picks the symbol\'s own size', () => {
        configureMetoc({pointFullSizeScale: 1_000_000});
        const collection = new MetocCollection();
        const editor = new MetocInteraction(collection, view);
        editor.startDrawing(N.HighPressureCenter);
        editor.pointerDown(at(100, -100));
        const id = editor.selectedId!;
        // 18 px out at full size, so 9 at half size, on the diagonal.
        const handle = editor.overlay().handles.find((h) => h.kind === 'resize')!;
        expect(px(handle.lonLat)).toEqual([106, -94]);
        // Dragged to 1.5 times the drawn size: large, as the symbol's own size.
        editor.pointerDown(at(106, -94));
        editor.pointerMove(at(110, -90));
        editor.pointerUp(at(110, -90));
        expect(collection.get(id)!.properties.metoc.size).toBe('large');
    });
});
