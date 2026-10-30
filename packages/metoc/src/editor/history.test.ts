import {MetocGraphicName as N, MetocCollection, fromMercator, toMercator, drawnPoints, metocFeature} from '../index.js';
import {MetocHistory} from './history';
import {MetocInteraction, type Pixel, type ViewAdapter} from './interaction';

const line = (): [number, number][] => [
    [-90, 30],
    [-80, 32],
];

describe('MetocHistory', () => {
    it('undoes and redoes to checkpoints, ids included', () => {
        const c = new MetocCollection();
        const h = new MetocHistory(c);
        const id = c.add(metocFeature(N.ColdFront, line()));
        h.checkpoint();
        c.setProperties(id, {});
        c.remove(id);
        h.checkpoint();
        expect(h.undo()).toBe(true);
        expect(c.has(id)).toBe(true);
        expect(h.undo()).toBe(true);
        expect(c.size).toBe(0);
        expect(h.undo()).toBe(false);
        expect(h.redo()).toBe(true);
        expect(c.has(id)).toBe(true);
    });

    it('records nothing for a checkpoint that changed nothing', () => {
        const c = new MetocCollection();
        const h = new MetocHistory(c);
        expect(h.checkpoint()).toBe(false);
        expect(h.canUndo).toBe(false);
    });

    it('commits uncheckpointed changes before undoing, so they can be redone', () => {
        const c = new MetocCollection();
        const h = new MetocHistory(c);
        const id = c.add(metocFeature(N.Isotherm, line()));
        h.checkpoint();
        c.setProperties(id, {value: '5'});
        h.undo();
        expect(c.get(id)!.properties.metoc.value).toBeUndefined();
        h.redo();
        expect(c.get(id)!.properties.metoc.value).toBe('5');
    });

    it('drops the redo branch on a new edit, and keeps at most the limit', () => {
        const c = new MetocCollection();
        const h = new MetocHistory(c, 2);
        for (let i = 0; i < 4; i++) {
            c.add(metocFeature(N.Trough, line()));
            h.checkpoint();
        }
        h.undo();
        h.undo();
        expect(h.undo()).toBe(false);
        expect(c.size).toBe(2);
        h.redo();
        c.add(metocFeature(N.Trough, line()));
        h.checkpoint();
        expect(h.canRedo).toBe(false);
    });
});

describe('editor commits', () => {
    const RES = 1000;
    const view: ViewAdapter = {
        toPixel: (ll) => {
            const m = toMercator(ll);
            return [m[0] / RES, -m[1] / RES];
        },
        toLonLat: (px) => fromMercator([px[0] * RES, -px[1] * RES]),
    };
    const at = (x: number, y: number) => ({pixel: [x, y] as Pixel});

    function setup() {
        const collection = new MetocCollection();
        const editor = new MetocInteraction(collection, view);
        const commits: number[] = [];
        editor.subscribe((e) => e.type === 'commit' && commits.push(collection.size));
        const id = collection.add(metocFeature(N.Trough, [view.toLonLat([100, 100]), view.toLonLat([300, 100])]));
        return {collection, editor, commits, id};
    }

    it('commits once per drag, after it', () => {
        const {editor, commits, collection, id} = setup();
        editor.pointerDown(at(200, 101));
        editor.pointerMove(at(200, 120));
        editor.pointerMove(at(200, 140));
        expect(commits).toHaveLength(0);
        editor.pointerUp();
        expect(commits).toHaveLength(1);
        expect(drawnPoints(collection.get(id)!)[0][1]).toBeLessThan(view.toLonLat([100, 100])[1]);
    });

    it('does not commit a click that moved nothing', () => {
        const {editor, commits} = setup();
        editor.pointerDown(at(200, 101));
        editor.pointerUp();
        expect(commits).toHaveLength(0);
    });

    it('commits a finished drawing, a deletion and a point removed', () => {
        const {editor, commits, id} = setup();
        editor.startDrawing(N.Trough);
        editor.pointerDown(at(10, 10));
        editor.pointerDown(at(60, 10));
        editor.keyDown('Enter');
        expect(commits).toEqual([2]);
        editor.select(id);
        editor.deleteSelected();
        expect(commits).toEqual([2, 1]);
    });
});

describe('duplicate and nudge', () => {
    const RES = 1000;
    const view: ViewAdapter = {
        toPixel: (ll) => {
            const m = toMercator(ll);
            return [m[0] / RES, -m[1] / RES];
        },
        toLonLat: (px) => fromMercator([px[0] * RES, -px[1] * RES]),
    };
    const px = (c: MetocCollection, id: string) => drawnPoints(c.get(id)!).map((p) => view.toPixel(p).map(Math.round));

    function setup() {
        const collection = new MetocCollection();
        const editor = new MetocInteraction(collection, view);
        const id = collection.add(metocFeature(N.Isotherm, [view.toLonLat([100, 100]), view.toLonLat([300, 100])], {value: '5'}));
        editor.select(id);
        return {collection, editor, id};
    }

    it('duplicates with an offset and selects the copy, properties included', () => {
        const {collection, editor, id} = setup();
        const copy = editor.keyDownWith('d', {ctrlKey: true}) ? editor.selectedId! : '';
        expect(copy).not.toBe(id);
        expect(px(collection, copy)).toEqual([
            [116, 116],
            [316, 116],
        ]);
        expect(collection.get(copy)!.properties.metoc).toEqual({name: N.Isotherm, value: '5'});
    });

    it('nudges a pixel with the arrows and ten with Shift', () => {
        const {collection, editor, id} = setup();
        editor.keyDownWith('ArrowRight', {});
        editor.keyDownWith('ArrowDown', {shiftKey: true});
        expect(px(collection, id)[0]).toEqual([101, 110]);
    });

    it('leaves the arrows alone with nothing selected', () => {
        const {editor} = setup();
        editor.select(null);
        expect(editor.keyDownWith('ArrowRight', {})).toBe(false);
    });
});
