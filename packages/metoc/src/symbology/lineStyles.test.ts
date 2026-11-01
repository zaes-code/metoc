import {MetocGraphicName as N} from '../core/catalog';
import {type Paint, type ProjectedPosition as P} from '@zaes/symbology-engine';
import {paintMetocPath} from '../core/render';

const res = 10;
/** A straight line `px` pixels long, drawn right to left as Table M-III draws them (its first point on the right). */
const westward = (px: number): P[] => [
    [px * res, 0],
    [0, 0],
];
const eastward = (px: number): P[] => westward(px).reverse() as P[];
const coordsOf = (p: Paint): P[] => (p.geometry.type === 'Polygon' ? p.geometry.coordinates[0] : p.geometry.type === 'LineString' ? p.geometry.coordinates : [p.geometry.coordinates]);
const ys = (paints: Paint[]) => paints.flatMap(coordsOf).map((c) => c[1]);

describe('marks left of the drawn direction (below a line drawn right to left)', () => {
    it.each([N.LimitsUndercast, N.RestrictedArea])('%s', (name) => {
        // The marks reach furthest on the left: an undercast cup's bowl, a T's stem.
        const below = ys(paintMetocPath({name}, westward(400), {resolution: res}));
        expect(-Math.min(...below)).toBeGreaterThan(Math.max(...below) + 0.5 * res);
        // Reversed, they move to the other side, as a front's pips do.
        const above = ys(paintMetocPath({name}, eastward(400), {resolution: res}));
        expect(Math.max(...above)).toBeGreaterThan(-Math.min(...above) + 0.5 * res);
    });

    it('hangs an anchorage line’s half discs left of it, and keeps its anchor upright whichever way it runs', () => {
        for (const [points, cupsBelow] of [
            [westward(400), true],
            [eastward(400), false],
        ] as const) {
            const paints = paintMetocPath({name: N.AnchorageLine}, points, {resolution: res});
            const discs = paints.filter((p) => p.geometry.type === 'LineString' && coordsOf(p).length > 6 && Math.abs(coordsOf(p)[0][0] - 200 * res) > 20 * res);
            expect(discs.length).toBeGreaterThan(4);
            for (const d of discs) {
                const y = coordsOf(d).map((c) => c[1]);
                if (cupsBelow) expect(Math.min(...y)).toBeLessThan(-res);
                else expect(Math.max(...y)).toBeGreaterThan(res);
            }
            // The anchor's stock (its crossbar) is above its crown (the curved arms) on the page, either way.
            const anchor = paints.filter((p) => p.geometry.type === 'LineString' && coordsOf(p).every((c) => Math.abs(c[0] - 200 * res) < 16 * res));
            const stock = anchor.map(coordsOf).find((c) => c.length === 2 && Math.abs(c[0][1] - c[1][1]) < 1e-6)!;
            const crown = anchor.map(coordsOf).find((c) => c.length > 6)!;
            expect(stock[0][1]).toBeGreaterThan(Math.max(...crown.map((c) => c[1])));
        }
    });
});

describe('Current Flow - Flood (Table M-III): one feather, two strokes on the right of the flow', () => {
    it('draws two parallel strokes at the tail, right of the flow, slanting back', () => {
        // Flowing north: the tail at the south end.
        const paints = paintMetocPath({name: N.CurrentFlowFlood}, [[0, 0], [0, 400 * res]], {resolution: res});
        const strokes = paints.filter((p) => p.role === 'decoration' && p.geometry.type === 'LineString' && coordsOf(p).length === 2).map(coordsOf);
        expect(strokes).toHaveLength(2);
        for (const [onShaft, tip] of strokes) {
            expect(Math.abs(onShaft[0])).toBeLessThan(1e-6);
            expect(tip[0]).toBeGreaterThan(0);
            expect(tip[1]).toBeLessThan(onShaft[1]);
        }
        const slope = ([a, b]: P[]) => (b[1] - a[1]) / (b[0] - a[0]);
        expect(slope(strokes[0])).toBeCloseTo(slope(strokes[1]), 6);
    });

    it('draws no feather on the ebb', () => {
        const paints = paintMetocPath({name: N.CurrentFlowEbb}, [[0, 0], [0, 400 * res]], {resolution: res});
        expect(paints.filter((p) => p.role === 'decoration' && coordsOf(p).length === 2)).toHaveLength(0);
    });
});

describe('Pipelines (Table M-III): dash and circle in step', () => {
    it('keeps every circle the same distance from the dash before it, along the whole line', () => {
        for (const px of [137, 400, 1001]) {
            const paints = paintMetocPath({name: N.Pipeline}, eastward(px), {resolution: res});
            const circles = paints.filter((p) => p.geometry.type === 'Polygon' && p.fill).map((p) => Math.min(...coordsOf(p).map((c) => c[0])));
            const dashes = paints.filter((p) => p.geometry.type === 'LineString').map((p) => Math.max(...coordsOf(p).map((c) => c[0])));
            expect(circles.length).toBeGreaterThan(3);
            expect(dashes).toHaveLength(circles.length);
            for (let i = 0; i < circles.length; i++) expect(Math.abs(circles[i] - dashes[i]) / res).toBeLessThan(0.5);
        }
    });
});
