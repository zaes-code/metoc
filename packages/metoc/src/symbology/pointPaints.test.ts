import {MetocGraphicName as N} from '../core/catalog';
import {DEFAULT_METOC_PALETTE} from '../core/config';
import {type Paint, type ProjectedPosition as P, ringSelfIntersects} from '@zaes/symbology-engine';
import {paintMetocPath} from '../core/render';
import {bandAxis} from './areaPaints';
import {BARB_SHAFT_PX, barbCounts} from './pointPaints';

const res = 100;
const paint = (name: N, extra: object = {}, anchor: P = [0, 1_000_000]) => paintMetocPath({name, ...extra}, [anchor], {resolution: res});
const labels = (paints: Paint[]) => paints.filter((p) => p.role === 'label').map((p) => p.text!.text);

describe('pressure centres (Table M-II)', () => {
    it('writes L and H in red and blue, with the central pressure below', () => {
        const low = paint(N.LowPressureCenter, {value: '998'});
        expect(labels(low)).toEqual(['L', '998']);
        expect(low[0].text!.color).toBe(DEFAULT_METOC_PALETTE.warm);
        const [letter, tag] = low;
        expect((tag.geometry.coordinates as unknown as P)[1]).toBeLessThan((letter.geometry.coordinates as unknown as P)[1]);
        expect(paint(N.HighPressureCenter)[0].text).toMatchObject({text: 'H', color: DEFAULT_METOC_PALETTE.cold});
        expect(labels(paint(N.CycloneCenter))).toEqual(['C']);
        expect(labels(paint(N.AnticycloneCenter))).toEqual(['A']);
    });

    it('draws no tag when there is no pressure', () => {
        expect(labels(paint(N.LowPressureCenter))).toEqual(['L']);
    });

    it('boxes the tropopause: height over L pointing down, H over height pointing up', () => {
        const low = paint(N.TropopauseLow, {value: '270'});
        const lowLabels = low.filter((p) => p.role === 'label');
        const y = (t: string) => (lowLabels.find((p) => p.text!.text === t)!.geometry.coordinates as unknown as P)[1];
        expect(y('270')).toBeGreaterThan(y('L'));
        const high = paint(N.TropopauseHigh, {value: '460'}).filter((p) => p.role === 'label');
        const yh = (t: string) => (high.find((p) => p.text!.text === t)!.geometry.coordinates as unknown as P)[1];
        expect(yh('H')).toBeGreaterThan(yh('460'));
        expect(low.some((p) => p.geometry.type === 'Polygon')).toBe(true);
    });

    it('draws calm winds as two circles', () => {
        expect(paint(N.CalmWinds).filter((p) => p.geometry.type === 'LineString')).toHaveLength(2);
    });
});

describe('wind barbs (Table M-I)', () => {
    it('rounds to 5 kt and splits into pennants, barbs and half barbs', () => {
        expect(barbCounts(2)).toEqual({pennants: 0, barbs: 0, halves: 0});
        expect(barbCounts(5)).toEqual({pennants: 0, barbs: 0, halves: 1});
        expect(barbCounts(23)).toEqual({pennants: 0, barbs: 2, halves: 1});
        expect(barbCounts(65)).toEqual({pennants: 1, barbs: 1, halves: 1});
        expect(barbCounts(101)).toEqual({pennants: 2, barbs: 0, halves: 0});
        // 103 rounds to 105 ("rounded to the nearest 5 knots").
        expect(barbCounts(103)).toEqual({pennants: 2, barbs: 0, halves: 1});
        expect(barbCounts(undefined)).toBeNull();
    });

    const shaft = (paints: Paint[]) => paints.find((p) => p.role === 'line')!.geometry.coordinates as unknown as P[];

    it('points the shaft where the wind comes from, to the nearest 10 degrees, screen-sized', () => {
        const west = shaft(paint(N.WindBarb, {windDirection: 268, windSpeed: 10}, [0, 0]));
        const tip = west[1];
        expect(tip[0]).toBeCloseTo(-BARB_SHAFT_PX * res, 6);
        expect(Math.abs(tip[1])).toBeLessThan(1e-6);
    });

    it('puts the barbs on the left of the shaft, looking down the wind, in the north and the right in the south', () => {
        // The direction a full barb leaves the shaft, as (east, north) signs.
        const barbLean = (windDirection: number, anchor: P) => {
            const paints = paint(N.WindBarb, {windDirection, windSpeed: 10}, anchor);
            const barb = paints.filter((p) => p.role === 'decoration' && p.geometry.type === 'LineString')[1];
            const [a, b] = barb.geometry.coordinates as unknown as P[];
            return [Math.sign(Math.round(b[0] - a[0])), Math.sign(Math.round(b[1] - a[1]))];
        };
        const north: P = [0, 1_000_000];
        const south: P = [0, -1_000_000];
        // WMO and NWS (and MetPy's barbs): a north wind's barbs stand east of the shaft, a west
        // wind's north of it, a south wind's west and an east wind's south.
        expect(barbLean(0, north)[0]).toBe(1);
        expect(barbLean(270, north)[1]).toBe(1);
        expect(barbLean(180, north)[0]).toBe(-1);
        expect(barbLean(90, north)[1]).toBe(-1);
        // Mirrored south of the equator.
        expect(barbLean(0, south)[0]).toBe(-1);
        expect(barbLean(270, south)[1]).toBe(-1);
    });

    it('draws a pennant for 50 kt and an X for a missing speed', () => {
        expect(paint(N.WindBarb, {windDirection: 90, windSpeed: 50}).some((p) => p.geometry.type === 'Polygon' && p.fill)).toBe(true);
        const missing = paint(N.WindBarb, {windDirection: 90});
        expect(missing.filter((p) => p.role === 'decoration')).toHaveLength(3);
    });

    it('draws only the plot circle with no direction ("not displayed")', () => {
        const paints = paint(N.WindBarb, {windSpeed: 30});
        expect(paints).toHaveLength(1);
        expect(paints.some((p) => p.role === 'line')).toBe(false);
    });
});

describe('the convergence zone band (Line5)', () => {
    /** A band 2000 px long, 60 px tall at the west end and 40 at the east. */
    const band: P[] = [
        [0, -30],
        [2000, -20],
        [2000, 20],
        [0, 30],
    ].map(([x, y]) => [x * res, y * res] as P);

    it('finds the long axis', () => {
        const {axis, from, to} = bandAxis([...band, band[0]]);
        expect(Math.abs(axis[0])).toBeCloseTo(1, 3);
        expect((to - from) / res).toBeGreaterThan(1900);
    });

    it('draws two rails, apart where the band is wide, and rungs between them', () => {
        const paints = paintMetocPath({name: N.InterTropicalConvergenceZone}, band, {resolution: res});
        const rails = paints.filter((p) => p.role === 'line').map((p) => p.geometry.coordinates as unknown as P[]);
        expect(rails).toHaveLength(2);
        const gapAt = (x: number) => {
            const ys = rails.map((r) => r.reduce((best, c) => (Math.abs(c[0] - x) < Math.abs(best[0] - x) ? c : best))[1]);
            return Math.abs(ys[0] - ys[1]) / res;
        };
        expect(gapAt(100 * res)).toBeGreaterThan(gapAt(1900 * res));
        expect(paints.filter((p) => p.role === 'decoration').length).toBeGreaterThan(10);
    });
});

describe('ringSelfIntersects', () => {
    it('finds a bow tie and passes a simple ring, closed or open', () => {
        expect(ringSelfIntersects([[0, 0], [10, 10], [10, 0], [0, 10]])).toBe(true);
        expect(ringSelfIntersects([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]])).toBe(false);
        expect(ringSelfIntersects([[0, 0], [10, 0], [5, 8]])).toBe(false);
    });
});
