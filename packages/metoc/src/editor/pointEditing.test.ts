import {MetocGraphicName as N, MetocCollection, fromMercator, toMercator, drawnPoints, metocFeature, validateMetocFeature} from '../index.js';
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

function setup() {
    const collection = new MetocCollection();
    const editor = new MetocInteraction(collection, view);
    return {collection, editor};
}

describe('drawing points', () => {
    it('places a pressure centre with one click, as a Point', () => {
        const {collection, editor} = setup();
        editor.startDrawing(N.HighPressureCenter);
        editor.pointerDown(at(100, -2000));
        expect(collection.size).toBe(1);
        expect(collection.list()[0].geometry.type).toBe('Point');
        expect(editor.mode).toBe('idle');
    });

    it('takes a wind barb from two clicks: the station, then where the wind comes from', () => {
        const {collection, editor} = setup();
        editor.startDrawing(N.WindBarb, {windSpeed: 20});
        editor.pointerDown(at(100, -2000));
        expect(collection.size).toBe(0);
        editor.pointerMove(at(50, -2000));
        expect(editor.overlay().draft!.properties.metoc.windDirection).toBe(270);
        editor.pointerDown(at(100, -2100));
        const f = collection.list()[0];
        expect(f.geometry.type).toBe('Point');
        // Screen up is north.
        expect(f.properties.metoc).toEqual({name: N.WindBarb, windSpeed: 20, windDirection: 0});
    });

    it('turns a selected wind barb with its rotate handle, one undo step', () => {
        const {collection, editor} = setup();
        const commits: number[] = [];
        editor.subscribe((e) => e.type === 'commit' && commits.push(1));
        const id = collection.add(metocFeature(N.WindBarb, [view.toLonLat([100, -2000])], {windDirection: 0, windSpeed: 10}));
        editor.select(id);
        const handle = editor.overlay().handles.find((h) => h.kind === 'rotate')!;
        const [hx, hy] = view.toPixel(handle.lonLat);
        expect(editor.pointerDown(at(hx, hy))).toBe(true);
        expect(editor.mode).toBe('rotate');
        editor.pointerMove(at(160, -2000));
        editor.pointerUp();
        expect(collection.get(id)!.properties.metoc.windDirection).toBe(90);
        expect(commits).toHaveLength(1);
    });

    it('picks a point near its anchor and moves it', () => {
        const {collection, editor} = setup();
        const id = collection.add(metocFeature(N.CalmWinds, [view.toLonLat([100, -2000])]));
        expect(editor.pointerDown(at(108, -2005))).toBe(true);
        editor.pointerMove(at(158, -2005));
        editor.pointerUp();
        expect(view.toPixel(drawnPoints(collection.get(id)!)[0]).map(Math.round)).toEqual([150, -2000]);
    });

    it('offers no insert handles on a point, and keeps its one point', () => {
        const {collection, editor} = setup();
        const id = collection.add(metocFeature(N.CycloneCenter, [view.toLonLat([100, -2000])]));
        editor.select(id);
        expect(editor.overlay().handles.filter((h) => h.kind === 'insert')).toHaveLength(0);
        editor.pointerDown({pixel: [100, -2000], altKey: true});
        expect(drawnPoints(collection.get(id)!)).toHaveLength(1);
    });
});

describe('self-crossing areas', () => {
    it('refuses to finish one, says why, and keeps drawing', () => {
        const {collection, editor} = setup();
        const reasons: string[] = [];
        editor.subscribe((e) => e.type === 'rejected' && reasons.push(e.reason));
        editor.startDrawing(N.Fog);
        for (const [x, y] of [
            [0, 0],
            [100, 100],
            [100, 0],
            [0, 100],
        ]) {
            editor.pointerDown(at(x, y));
        }
        expect(editor.finishDrawing()).toBeNull();
        expect(collection.size).toBe(0);
        expect(editor.mode).toBe('drawing');
        expect(reasons[0]).toMatch(/crosses itself/);
        // Take back the last two points and close it the other way round.
        editor.keyDown('Backspace');
        editor.keyDown('Backspace');
        editor.pointerDown(at(0, 100));
        expect(editor.finishDrawing()).not.toBeNull();
    });

    it('lets an edit make one, and validation reports it', () => {
        const {collection} = setup();
        const id = collection.add(metocFeature(N.Fog, [view.toLonLat([0, 0]), view.toLonLat([100, 0]), view.toLonLat([100, 100]), view.toLonLat([0, 100])]));
        expect(validateMetocFeature(collection.get(id)!)).toEqual([]);
        collection.setPoints(id, [view.toLonLat([0, 0]), view.toLonLat([100, 100]), view.toLonLat([100, 0]), view.toLonLat([0, 100])]);
        expect(validateMetocFeature(collection.get(id)!)).toEqual(['the outline crosses itself']);
    });

    it('reports a wind barb with no direction', () => {
        expect(validateMetocFeature(metocFeature(N.WindBarb, [[0, 0]]))[0]).toMatch(/no wind direction/);
    });
});

describe('saving points', () => {
    it('round-trips a wind barb and normalises its direction', () => {
        const c = new MetocCollection();
        const id = c.add(metocFeature(N.WindBarb, [[-80, 30]], {windDirection: -90, windSpeed: 15}));
        expect(c.get(id)!.properties.metoc.windDirection).toBe(270);
        const b = new MetocCollection();
        expect(b.load(JSON.parse(JSON.stringify(c.toGeoJSON()))).skipped).toEqual([]);
        expect(b.toGeoJSON()).toEqual(c.toGeoJSON());
        expect(new MetocCollection().load({type: 'Feature', geometry: {type: 'LineString', coordinates: [[0, 0], [1, 1]]}, properties: {metoc: {name: N.WindBarb}}}).skipped).toHaveLength(1);
    });
});
