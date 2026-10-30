import {MetocGraphicName as N, MetocCollection, WORLD_WIDTH, drawnPoints, fromMercator, nearestWorldX, paintMetocGraphic, toMercator, wrapLongitude} from '../index.js';
import {MetocInteraction, type Pixel, type ViewAdapter} from './interaction';

/**
 * A view looking at the antimeridian as OpenLayers shows it: 1000 m per pixel, the centre at 180°,
 * `toLonLat` answering in [-180, 180) as OpenLayers' toLonLat does, and `toPixel` putting a point
 * on the copy of the world nearest the centre, as the renderers' view adapters do.
 */
const RES = 1000;
const CX = WORLD_WIDTH / 2;
const view: ViewAdapter = {
    toPixel: (ll) => {
        const m = toMercator(ll);
        return [(nearestWorldX(m[0], CX) - CX) / RES + 500, -m[1] / RES];
    },
    toLonLat: (px) => {
        const ll = fromMercator([(px[0] - 500) * RES + CX, -px[1] * RES]);
        return [wrapLongitude(ll[0]), ll[1]];
    },
};
const at = (x: number, y: number) => ({pixel: [x, y] as Pixel});

/** Widest x span of a graphic's marks, in projected meters. */
function span(c: MetocCollection, id: string): number {
    const xs = paintMetocGraphic(c.get(id)!, {resolution: RES}).flatMap((p) => {
        const g = p.geometry;
        return g.type === 'Point' ? [g.coordinates[0]] : g.type === 'LineString' ? g.coordinates.map((q) => q[0]) : g.coordinates.flat().map((q) => q[0]);
    });
    return Math.max(...xs) - Math.min(...xs);
}

function drawFront(editor: MetocInteraction, collection: MetocCollection): string {
    editor.startDrawing(N.ColdFront);
    // From west of the antimeridian (x < 500) to east of it.
    for (const x of [300, 450, 600]) {
        editor.pointerDown(at(x, -5000));
        editor.pointerUp();
    }
    editor.pointerDown(at(700, -5000));
    editor.pointerDown(at(700, -5000));
    editor.doubleClick(at(700, -5000));
    return collection.list()[0].id as string;
}

describe('across the antimeridian', () => {
    it('saves a front drawn across it as one continuous line, the short way', () => {
        const collection = new MetocCollection();
        const editor = new MetocInteraction(collection, view);
        const id = drawFront(editor, collection);
        const lons = drawnPoints(collection.get(id)!).map((p) => p[0]);
        // Continuous: each within 180° of the one before, running past 180, the first in range.
        for (let i = 1; i < lons.length; i++) expect(Math.abs(lons[i] - lons[i - 1])).toBeLessThan(180);
        expect(lons[0]).toBeLessThan(180);
        expect(lons[lons.length - 1]).toBeGreaterThan(180);
        // Painted 400 px wide, not round the world.
        expect(span(collection, id)).toBeLessThan(500 * RES);
    });

    it('keeps handles on the graphic the view shows, and drags a point across', () => {
        const collection = new MetocCollection();
        const editor = new MetocInteraction(collection, view);
        const id = drawFront(editor, collection);
        expect(drawnPoints(collection.get(id)!).map((p) => Math.round(view.toPixel(p)[0]))).toEqual([300, 450, 600, 700]);
        // Drag the first point from the west side to the east side of the antimeridian.
        editor.select(id);
        editor.pointerDown(at(300, -5000));
        editor.pointerMove(at(650, -5100));
        editor.pointerUp();
        expect(Math.round(view.toPixel(drawnPoints(collection.get(id)!)[0])[0])).toBe(650);
        expect(span(collection, id)).toBeLessThan(500 * RES);
    });

    it('moves a whole graphic across it without sending it round the world', () => {
        const collection = new MetocCollection();
        const editor = new MetocInteraction(collection, view);
        const id = drawFront(editor, collection);
        editor.select(id);
        // Grab the line between its second and third points (off the midpoint, where the insert
        // handle is) and drag it 200 px east.
        editor.pointerDown(at(560, -5000));
        editor.pointerMove(at(760, -5000));
        editor.pointerUp();
        expect(drawnPoints(collection.get(id)!).map((p) => Math.round(view.toPixel(p)[0]))).toEqual([500, 650, 800, 900]);
        expect(span(collection, id)).toBeLessThan(500 * RES);
    });
});
