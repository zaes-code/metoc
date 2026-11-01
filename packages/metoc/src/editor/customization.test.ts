import {MetocGraphicName as N, MetocCollection, configureMetoc, fromMercator, metocFeature, paintMetocGraphic, resetMetocConfig, toMercator} from '../index.js';
import {editorOverlay} from './attach';
import {MetocInteraction, type Pixel, type ViewAdapter} from './interaction';

const RES = 1000;
const view: ViewAdapter = {
    toPixel: (ll) => {
        const m = toMercator(ll);
        return [m[0] / RES, -m[1] / RES];
    },
    toLonLat: (px) => fromMercator([px[0] * RES, -px[1] * RES]),
};
const at = (x: number, y: number) => ({pixel: [x, y] as Pixel});
const px = (ll: readonly number[]) => view.toPixel(ll as [number, number]).map((v) => Math.round(v));
const drag = (editor: MetocInteraction, from: number[], to: number[]) => {
    editor.pointerDown(at(from[0], from[1]));
    editor.pointerMove(at(to[0], to[1]));
    editor.pointerUp(at(to[0], to[1]));
};
function placed(name: N, options = {}) {
    const collection = new MetocCollection();
    const editor = new MetocInteraction(collection, view, options);
    editor.startDrawing(name);
    editor.pointerDown(at(100, -2000));
    return {collection, editor, id: editor.selectedId!};
}

afterEach(() => resetMetocConfig());

describe('resizing a point symbol', () => {
    it('steps through the three sizes, and the configured default is no size at all', () => {
        const {collection, editor, id} = placed(N.HighPressureCenter);
        const handle = editor.overlay().handles.find((h) => h.kind === 'resize')!;
        expect(px(handle.lonLat)).toEqual([113, -1987]);
        drag(editor, [113, -1987], [119, -1981]);
        expect(collection.get(id)!.properties.metoc.size).toBe('large');
        drag(editor, [119, -1981], [109, -1991]);
        expect(collection.get(id)!.properties.metoc.size).toBe('small');
        drag(editor, [109, -1991], [113, -1987]);
        expect('size' in collection.get(id)!.properties.metoc).toBe(false);
    });

    it('is not offered when the host forbids resizing', () => {
        const {editor} = placed(N.HighPressureCenter, {allow: {resize: false}});
        expect(editor.overlay().handles.some((h) => h.kind === 'resize')).toBe(false);
    });
});

describe('turning a point symbol', () => {
    it('has no rotate handle unless the configuration allows it', () => {
        expect(placed(N.HighPressureCenter).editor.overlay().handles.some((h) => h.kind === 'rotate')).toBe(false);
        configureMetoc({allowPointRotation: true});
        expect(placed(N.HighPressureCenter).editor.overlay().handles.some((h) => h.kind === 'rotate')).toBe(true);
        expect(placed(N.StationPlot).editor.overlay().handles.some((h) => h.kind === 'rotate')).toBe(false);
    });

    it('turns with its handle, and upright is no rotation at all', () => {
        configureMetoc({allowPointRotation: true});
        const {collection, editor, id} = placed(N.HighPressureCenter);
        const tip = editor.overlay().handles.find((h) => h.kind === 'rotate')!;
        expect(px(tip.lonLat)).toEqual([100, -2028]);
        drag(editor, [100, -2028], [128, -2000]);
        expect(collection.get(id)!.properties.metoc.rotation).toBe(90);
        drag(editor, [128, -2000], [100, -2028]);
        expect('rotation' in collection.get(id)!.properties.metoc).toBe(false);
    });

    it('paints the symbol turned about its anchor, its letter and its boxed value turned with it', () => {
        const upright = paintMetocGraphic(metocFeature(N.TropopauseLow, [[0, 0]], {value: '350'}), {resolution: 1});
        const turned = paintMetocGraphic(metocFeature(N.TropopauseLow, [[0, 0]], {value: '350', rotation: 90}), {resolution: 1});
        // The height is written inside the box: part of the picture, so it turns with it.
        expect(turned.find((p) => p.text?.text === '350')!.text!.rotation).toBeCloseTo(-Math.PI / 2);
        const box = (paints: typeof upright) => paints.find((p) => p.geometry.type === 'Polygon')!.geometry.coordinates as number[][][];
        // The box's first corner, (-26, 24) upright, is (24, 26) turned a quarter clockwise.
        const [x, y] = box(upright)[0][0];
        const [tx, ty] = box(turned)[0][0];
        expect([Math.round(tx), Math.round(ty)]).toEqual([Math.round(y), Math.round(-x)]);
        expect(turned.find((p) => p.text?.text === 'L')!.text!.rotation).toBeCloseTo(-Math.PI / 2);
    });

    it('turns a value written inside a glyph’s box or ellipse, and keeps a value beside the symbol upright', () => {
        const rotationOf = (name: N, value: string) =>
            paintMetocGraphic(metocFeature(name, [[0, 0]], {value, rotation: 90}), {resolution: 1}).find((p) => p.text?.text === value)!.text!.rotation;
        for (const name of [N.FreezingLevel, N.TropopauseLevel, N.IceThicknessObserved, N.IceThicknessEstimated, N.TurbulenceMountainWaves]) {
            expect(rotationOf(name, '350'), name).toBeCloseTo(-Math.PI / 2);
        }
        // The central pressure under an L, and a height under a turbulence mark, stand beside it.
        expect(rotationOf(N.LowPressureCenter, '998')).toBe(0);
        expect(rotationOf(N.TurbulenceModerate, '250')).toBe(0);
    });

    it('never turns a wind barb by rotation: its wind direction does', () => {
        const barb = (extra = {}) => paintMetocGraphic(metocFeature(N.WindBarb, [[0, 0]], {windDirection: 270, windSpeed: 20, ...extra}), {resolution: 1});
        expect(barb({rotation: 45})).toEqual(barb());
    });

    it('is saved, normalised, and upright drops it', () => {
        const c = new MetocCollection();
        const id = c.add(metocFeature(N.HighPressureCenter, [[0, 0]], {rotation: -90}));
        expect(c.get(id)!.properties.metoc.rotation).toBe(270);
        const json = c.toGeoJSON();
        (json.features[0].properties as {metoc: {rotation: number}}).metoc.rotation = 360;
        const d = new MetocCollection();
        d.load(json);
        expect('rotation' in d.list()[0].properties.metoc).toBe(false);
    });
});

describe('the editor chrome from the configuration', () => {
    it('colours the rotate and resize handles and sets the selection width', () => {
        configureMetoc({allowPointRotation: true, rotateHandleColor: '#ff0000', resizeHandleColor: '#0000ff', selectionWidth: 4});
        const {editor} = placed(N.HighPressureCenter);
        const o = editorOverlay(editor, RES);
        expect(o.handles.map((h) => h.fill)).toEqual(expect.arrayContaining(['#ff0000', '#0000ff']));
        expect(o.under[0].stroke?.widthPx).toBe(4);
    });
});
