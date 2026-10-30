import {MetocGraphicName as N, MetocCollection, fromMercator, toMercator, drawnPoints, metocFeature} from '../index.js';
import {MetocInteraction, type Pixel, type ViewAdapter} from './interaction';

/** A view 1000 m per pixel, origin at 0,0, y down like a screen. */
const RES = 1000;
const view: ViewAdapter = {
    toPixel: (ll) => {
        const m = toMercator(ll);
        return [m[0] / RES, -m[1] / RES];
    },
    toLonLat: (px) => fromMercator([px[0] * RES, -px[1] * RES]),
};
const at = (x: number, y: number) => ({pixel: [x, y] as Pixel});
const pixels = (c: MetocCollection, id: string) => drawnPoints(c.get(id)!).map((p) => view.toPixel(p).map((v) => Math.round(v)));

function setup() {
    const collection = new MetocCollection();
    const editor = new MetocInteraction(collection, view);
    return {collection, editor};
}

describe('drawing', () => {
    it('adds a point per click and finishes on double-click, selecting the result', () => {
        const {collection, editor} = setup();
        const ends: string[] = [];
        editor.subscribe((e) => e.type === 'drawend' && ends.push(e.id));
        editor.startDrawing(N.ColdFront);
        expect(editor.pointerDown(at(300, 100))).toBe(true);
        editor.pointerUp();
        editor.pointerDown(at(200, 120));
        editor.pointerUp();
        // A double-click arrives as two downs on the same spot, then the dblclick.
        editor.pointerDown(at(100, 100));
        editor.pointerDown(at(100, 100));
        expect(editor.doubleClick(at(100, 100))).toBe(true);
        expect(collection.size).toBe(1);
        const id = collection.list()[0].id as string;
        expect(pixels(collection, id)).toEqual([
            [300, 100],
            [200, 120],
            [100, 100],
        ]);
        expect(editor.selectedId).toBe(id);
        expect(editor.mode).toBe('idle');
        expect(ends).toEqual([id]);
    });

    it('shows a draft that follows the pointer', () => {
        const {editor} = setup();
        editor.startDrawing(N.WarmFront);
        editor.pointerDown(at(10, 10));
        editor.pointerMove(at(50, 10));
        const draft = editor.overlay().draft!;
        expect(drawnPoints(draft).map((c) => view.toPixel(c).map(Math.round))).toEqual([
            [10, 10],
            [50, 10],
        ]);
    });

    it('needs two distinct points to finish', () => {
        const {collection, editor} = setup();
        editor.startDrawing(N.ColdFront);
        editor.pointerDown(at(10, 10));
        editor.doubleClick(at(10, 10));
        expect(collection.size).toBe(0);
        expect(editor.mode).toBe('drawing');
    });

    it('undoes a point on Backspace and cancels on Escape', () => {
        const {collection, editor} = setup();
        editor.startDrawing(N.ColdFront);
        editor.pointerDown(at(10, 10));
        editor.pointerDown(at(60, 10));
        editor.keyDown('Backspace');
        expect(editor.overlay().handles).toHaveLength(1);
        editor.keyDown('Escape');
        expect(editor.mode).toBe('idle');
        expect(collection.size).toBe(0);
    });

    it('finishes on Enter', () => {
        const {collection, editor} = setup();
        editor.startDrawing(N.Trough);
        editor.pointerDown(at(10, 10));
        editor.pointerDown(at(60, 10));
        expect(editor.keyDown('Enter')).toBe(true);
        expect(collection.size).toBe(1);
    });
});

describe('editing', () => {
    function withLine() {
        const s = setup();
        const id = s.collection.add(metocFeature(N.ColdFront, [view.toLonLat([300, 100]), view.toLonLat([200, 100]), view.toLonLat([100, 100])]));
        return {...s, id};
    }

    it('selects a graphic by clicking its line and moves it by dragging', () => {
        const {collection, editor, id} = withLine();
        expect(editor.pointerDown(at(250, 104))).toBe(true);
        expect(editor.selectedId).toBe(id);
        expect(editor.mode).toBe('dragGraphic');
        editor.pointerMove(at(250, 154));
        editor.pointerUp();
        expect(pixels(collection, id)).toEqual([
            [300, 150],
            [200, 150],
            [100, 150],
        ]);
    });

    it('leaves a click on empty map to the map, and deselects', () => {
        const {editor} = withLine();
        editor.select(editor.collection.list()[0].id as string);
        expect(editor.pointerDown(at(250, 300))).toBe(false);
        expect(editor.selectedId).toBeNull();
    });

    it('moves one point by dragging its handle', () => {
        const {collection, editor, id} = withLine();
        editor.select(id);
        expect(editor.pointerDown(at(300, 100))).toBe(true);
        expect(editor.mode).toBe('dragVertex');
        editor.pointerMove(at(320, 140));
        editor.pointerUp();
        expect(pixels(collection, id)[0]).toEqual([320, 140]);
        expect(pixels(collection, id)[1]).toEqual([200, 100]);
    });

    it('inserts a point from a + handle', () => {
        const {collection, editor, id} = withLine();
        editor.select(id);
        editor.pointerDown(at(250, 100));
        editor.pointerMove(at(250, 70));
        editor.pointerUp();
        expect(pixels(collection, id)).toEqual([
            [300, 100],
            [250, 70],
            [200, 100],
            [100, 100],
        ]);
    });

    it('removes a point on Alt-click, but keeps at least two', () => {
        const {collection, editor, id} = withLine();
        editor.select(id);
        editor.pointerDown({pixel: [200, 100], altKey: true});
        expect(drawnPoints(collection.get(id)!)).toHaveLength(2);
        editor.pointerDown({pixel: [100, 100], altKey: true});
        expect(drawnPoints(collection.get(id)!)).toHaveLength(2);
    });

    it('deletes the selected graphic on Delete', () => {
        const {collection, editor, id} = withLine();
        editor.select(id);
        expect(editor.keyDown('Delete')).toBe(true);
        expect(collection.size).toBe(0);
        expect(editor.selectedId).toBeNull();
    });

    it('drops the selection when the graphic is removed elsewhere', () => {
        const {collection, editor, id} = withLine();
        editor.select(id);
        collection.remove(id);
        expect(editor.selectedId).toBeNull();
    });

    it('publishes a handle per point and an insert handle per segment', () => {
        const {editor, id} = withLine();
        editor.select(id);
        const handles = editor.overlay().handles;
        expect(handles.filter((h) => h.kind === 'vertex')).toHaveLength(3);
        expect(handles.filter((h) => h.kind === 'insert')).toHaveLength(2);
    });
});
