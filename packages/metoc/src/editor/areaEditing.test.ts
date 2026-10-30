import {MetocGraphicName as N, MetocCollection, fromMercator, toMercator, drawnPoints, metocFeature} from '../index.js';
import {paintedOutline} from '../core/render.js';
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
const pixels = (c: MetocCollection, id: string) => drawnPoints(c.get(id)!).map((p) => view.toPixel(p).map((v) => Math.round(v)));

function withArea(filled = false) {
    const collection = new MetocCollection();
    const editor = new MetocInteraction(collection, view);
    const ring: Pixel[] = [
        [100, 100],
        [300, 100],
        [300, 300],
        [100, 300],
    ];
    const id = collection.add(metocFeature(N.InstrumentFlightRule, ring.map(view.toLonLat), filled ? {filled} : {}));
    return {collection, editor, id};
}

describe('drawing an area', () => {
    it('needs three points, and saves a closed Polygon', () => {
        const collection = new MetocCollection();
        const editor = new MetocInteraction(collection, view);
        editor.startDrawing(N.Fog);
        editor.pointerDown(at(100, 100));
        editor.pointerDown(at(200, 100));
        editor.doubleClick(at(200, 100));
        expect(collection.size).toBe(0);
        editor.pointerDown(at(150, 200));
        editor.doubleClick(at(150, 200));
        expect(collection.size).toBe(1);
        const f = collection.list()[0];
        expect(f.geometry.type).toBe('Polygon');
        const ring = (f.geometry as {coordinates: number[][][]}).coordinates[0];
        expect(ring).toHaveLength(4);
        expect(ring[0]).toEqual(ring[3]);
    });

    it('shows a guide that closes once there are three points, and a draft to paint', () => {
        const editor = new MetocInteraction(new MetocCollection(), view);
        editor.startDrawing(N.Fog);
        editor.pointerDown(at(100, 100));
        editor.pointerMove(at(200, 100));
        expect(editor.overlay().draft).toBeUndefined();
        expect(editor.overlay().guide).toHaveLength(2);
        editor.pointerDown(at(200, 100));
        editor.pointerMove(at(150, 200));
        const o = editor.overlay();
        expect(o.draft!.geometry.type).toBe('Polygon');
        expect(o.guide).toHaveLength(4);
        expect(o.guide![0]).toEqual(o.guide![3]);
    });
});

describe('editing an area', () => {
    it('has an insert handle on every edge, the closing one included', () => {
        const {editor, id} = withArea();
        editor.select(id);
        expect(editor.overlay().handles.filter((h) => h.kind === 'insert')).toHaveLength(4);
    });

    it('inserts a point on the closing edge at the end of the ring', () => {
        const {collection, editor, id} = withArea();
        editor.select(id);
        editor.pointerDown(at(100, 200));
        editor.pointerMove(at(80, 200));
        editor.pointerUp();
        expect(pixels(collection, id)).toEqual([
            [100, 100],
            [300, 100],
            [300, 300],
            [100, 300],
            [80, 200],
        ]);
    });

    it('keeps at least three points', () => {
        const {collection, editor, id} = withArea();
        editor.select(id);
        editor.pointerDown({pixel: [300, 300], altKey: true});
        expect(drawnPoints(collection.get(id)!)).toHaveLength(3);
        editor.pointerDown({pixel: [300, 100], altKey: true});
        expect(drawnPoints(collection.get(id)!)).toHaveLength(3);
    });

    it('is picked by its outline, and from inside only when filled', () => {
        const outline = withArea();
        // The outline curves through the corners, so its top edge is found, not assumed at y = 100.
        const top = paintedOutline(outline.collection.get(outline.id)!)
            .map((p) => view.toPixel(fromMercator(p)))
            .filter((p) => p[1] < 200)
            .reduce((a, b) => (Math.abs(b[0] - 200) < Math.abs(a[0] - 200) ? b : a));
        expect(outline.editor.pointerDown(at(200, 200))).toBe(false);
        expect(outline.editor.pointerDown(at(top[0], top[1] + 2))).toBe(true);
        expect(outline.editor.selectedId).toBe(outline.id);

        const filled = withArea(true);
        expect(filled.editor.pointerDown(at(200, 200))).toBe(true);
        expect(filled.editor.selectedId).toBe(filled.id);
    });

    it('moves the whole area by dragging', () => {
        const {collection, editor, id} = withArea(true);
        editor.pointerDown(at(200, 200));
        editor.pointerMove(at(230, 210));
        editor.pointerUp();
        expect(pixels(collection, id)[0]).toEqual([130, 110]);
    });
});

describe('saving areas', () => {
    it('round-trips a Polygon and refuses a line geometry for an area', () => {
        const {collection} = withArea();
        const b = new MetocCollection();
        expect(b.load(JSON.parse(JSON.stringify(collection.toGeoJSON()))).skipped).toEqual([]);
        expect(b.toGeoJSON()).toEqual(collection.toGeoJSON());
        const wrong = {type: 'Feature', geometry: {type: 'LineString', coordinates: [[0, 0], [1, 1], [1, 0]]}, properties: {metoc: {name: N.Fog}}};
        expect(new MetocCollection().load(wrong).skipped[0].reason).toMatch(/Polygon/);
    });
});
