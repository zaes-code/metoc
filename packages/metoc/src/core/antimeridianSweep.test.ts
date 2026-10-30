/**
 * # Every graphic, across the antimeridian
 *
 * Placed straddling the antimeridian, a graphic arrives from a file with folded longitudes —
 * 179.99 one side, -179.99 the other. The engine keeps drawn points continuous, so every painter
 * works on the shape drawn; `antimeridian.test.ts` pins that on a front, an isobar, a scalloped
 * area and the ITCZ, and this sweep holds every one of the catalog's graphics to it: every mark it paints lies within a few
 * kilometres of the points it was drawn on, never a world away.
 */

import type {Position} from 'geojson';
import {MetocCollection, drawnPoints, fromMercator, getMetocSpec, listMetocGraphics, metocFeature, paintMetocGraphic, validateMetocFeature, type MetocFeature, type MetocGraphicName} from '../index.js';
import {paintedOutline} from './render.js';

/** About 2 km either side of the antimeridian, at 10°N. */
const HALF = 0.02;
const fold = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;

function pointsFor(name: MetocGraphicName): Position[] {
    const kind = getMetocSpec(name).geometry;
    const raw: Position[] =
        kind === 'point'
            ? [[180 - HALF / 4, 10]]
            : kind === 'area'
              ? [[180 - HALF, 10 - HALF], [180 + HALF, 10 - HALF], [180 + HALF, 10 + HALF], [180 - HALF, 10 + HALF]]
              : [[180 - HALF, 10], [180, 10 + HALF / 2], [180 + HALF, 10]];
    return raw.map(([lon, lat]) => [fold(lon), lat]);
}

function sample(name: MetocGraphicName): MetocFeature {
    const value = getMetocSpec(name).valueField?.placeholder;
    const props = name === 'WindBarb' ? {windDirection: 270, windSpeed: 35} : value ? {value} : {};
    const c = new MetocCollection();
    // Through the store, as a file is loaded.
    const id = c.add(metocFeature(name, pointsFor(name), props));
    return c.get(id)!;
}

/** Great-circle distance in kilometres. */
function km(a: Position, b: Position): number {
    const r = Math.PI / 180;
    const h = Math.sin(((b[1] - a[1]) * r) / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(((b[0] - a[0]) * r) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const marksOf = (f: MetocFeature, resolution: number): Position[] =>
    paintMetocGraphic(f, {resolution}).flatMap((p) => {
        const g = p.geometry;
        const c = g.type === 'Point' ? [g.coordinates] : g.type === 'LineString' ? g.coordinates : g.coordinates.flat();
        return c.map((m) => fromMercator(m));
    });

describe('every graphic across the antimeridian', () => {
    const names = listMetocGraphics();

    it('really crosses: the points handed in are either side of 180', () => {
        const lons = pointsFor(names.find((n) => getMetocSpec(n).geometry === 'line')!).map((p) => p[0]);
        expect(lons.some((l) => l < 0) && lons.some((l) => l > 0)).toBe(true);
    });

    it.each(names)('%s paints every mark near the points it was drawn on', (name) => {
        const f = sample(name);
        const controls = drawnPoints(f);
        // The scale it would be seen at whole: about 4 km across 500 px, so decoration is ~100 m.
        const marks = marksOf(f, 10);
        expect(marks.length).toBeGreaterThan(0);
        const worst = Math.max(...marks.map((m) => Math.min(...controls.map((c) => km(m, c)))));
        expect(worst).toBeLessThan(5);
        // Its outline, which renderers cull and pick by, is as small as the graphic.
        const outline = paintedOutline(f).map((m) => fromMercator(m));
        expect(Math.max(...outline.map((m) => Math.min(...controls.map((c) => km(m, c)))))).toBeLessThan(5);
    });

    it('raises no false self-crossing for an area across', () => {
        const areas = names.filter((n) => getMetocSpec(n).geometry === 'area');
        expect(areas.length).toBeGreaterThan(0);
        for (const n of areas) expect(validateMetocFeature(sample(n)).some((w) => /crosses itself/.test(w))).toBe(false);
    });
});
