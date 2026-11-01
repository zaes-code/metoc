import {MetocGraphicName as N, getMetocSpec, listMetocGraphics} from '../core/catalog';
import {DEFAULT_METOC_PALETTE, configureMetoc, resetMetocConfig} from '../core/config';
import {type Paint, type ProjectedPosition as P, walker} from '@zaes/symbology-engine';
import {paintMetocPath} from '../core/render';

/** A straight line `px` pixels long at `res`, drawn right to left as Table M-II draws them. */
const westward = (px: number, res: number): P[] => [
    [px * res, 0],
    [0, 0],
];

/** A square area `px` pixels on a side, traced anticlockwise; its ring without the closing point. */
const square = (px: number, res: number): P[] => [
    [0, 0],
    [px * res, 0],
    [px * res, px * res],
    [0, px * res],
];

/** The drawn points a graphic of this kind needs. */
const shapeFor = (name: N, px: number, res: number): P[] => {
    const kind = getMetocSpec(name).geometry;
    return kind === 'area' ? square(px, res) : kind === 'point' ? [[0, 0]] : westward(px, res);
};

const decorations = (paints: Paint[]) => paints.filter((p) => p.role === 'decoration' && p.geometry.type === 'Polygon');

/** The extent of a ring, in pixels. */
function ringSizePx(p: Paint, res: number): {w: number; h: number} {
    const ring = (p.geometry as {coordinates: P[][]}).coordinates[0];
    const xs = ring.map((c) => c[0]);
    const ys = ring.map((c) => c[1]);
    return {w: (Math.max(...xs) - Math.min(...xs)) / res, h: (Math.max(...ys) - Math.min(...ys)) / res};
}

const ringCentroidY = (p: Paint) => {
    const ring = (p.geometry as {coordinates: P[][]}).coordinates[0];
    return ring.reduce((a, c) => a + c[1], 0) / ring.length;
};

afterEach(() => resetMetocConfig());

describe('every graphic', () => {
    it.each(listMetocGraphics())('%s paints something visible at map scales from 10 m to 10 km per pixel', (name) => {
        for (const res of [10, 1000, 10000]) {
            const paints = paintMetocPath({name, value: '1012', windDirection: 270, windSpeed: 25}, shapeFor(name, 400, res), {resolution: res});
            expect(paints.length).toBeGreaterThan(0);
            // Something visible: line work, a filled or stroked mark, or text. (Turbulence is dots
            // alone, a bioluminescence level is a fill alone, an ice limit is a chain of marks.)
            expect(paints.some((p) => !!p.stroke || !!p.fill || !!p.text)).toBe(true);
            for (const p of paints) if (p.stroke) expect(p.stroke.widthPx).toBeGreaterThan(0);
        }
    });

    it('paints no filled shape with a hole, which a TAK client fills whole', () => {
        // A TAK polyline is one filled ring: given a filled polygon with a hole, a TAK client fills
        // the outer ring and only strokes the hole, so the fill covers its own symbol. METOC has
        // none, and this keeps it so.
        const holed: string[] = [];
        for (const name of listMetocGraphics()) {
            for (const size of ['small', 'large'] as const) {
                for (const p of paintMetocPath({name, value: '1012', windDirection: 270, windSpeed: 65, size}, shapeFor(name, 400, 1000), {resolution: 1000})) {
                    if (p.geometry.type === 'Polygon' && p.fill && p.geometry.coordinates.length > 1) holed.push(name);
                }
            }
        }
        expect([...new Set(holed)]).toEqual([]);
    });

    it('paints nothing for fewer than two points or a non-positive resolution', () => {
        expect(paintMetocPath({name: N.ColdFront}, [[0, 0]], {resolution: 10})).toEqual([]);
        expect(paintMetocPath({name: N.ColdFront}, westward(100, 10), {resolution: 0})).toEqual([]);
    });
});

describe('screen-sized decoration', () => {
    it('keeps a pip the same size on screen at every resolution', () => {
        const sizes = [5, 500, 50000].map((res) => {
            const pip = decorations(paintMetocPath({name: N.ColdFront}, westward(600, res), {resolution: res}))[0];
            return ringSizePx(pip, res);
        });
        for (const s of sizes) {
            expect(s.w).toBeCloseTo(sizes[0].w, 6);
            expect(s.h).toBeCloseTo(sizes[0].h, 6);
        }
        expect(sizes[0].h).toBeCloseTo(10, 6);
    });

    it('scales pips with the configured pip size', () => {
        configureMetoc({pipSize: 16});
        const pip = decorations(paintMetocPath({name: N.ColdFront}, westward(800, 100), {resolution: 100}))[0];
        expect(ringSizePx(pip, 100).h).toBeCloseTo(16, 6);
    });

    it('draws a short line plain rather than crowding it with pips', () => {
        const paints = paintMetocPath({name: N.ColdFront}, westward(12, 100), {resolution: 100});
        expect(decorations(paints)).toHaveLength(0);
        expect(paints.filter((p) => p.role === 'line')).toHaveLength(1);
    });

    it('spaces pips evenly along the whole line', () => {
        const res = 100;
        const pips = decorations(paintMetocPath({name: N.ColdFront}, westward(600, res), {resolution: res}));
        const xs = pips.map((p) => (p.geometry as {coordinates: P[][]}).coordinates[0][1][0]).sort((a, b) => a - b);
        const gaps = xs.slice(1).map((x, i) => x - xs[i]);
        for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 6);
    });
});

describe('which side (Appendix M: the point order sets the pips)', () => {
    it('puts pips to the left of the drawn direction: below a line drawn right to left', () => {
        for (const name of [N.ColdFront, N.WarmFront, N.OccludedFront]) {
            const pips = decorations(paintMetocPath({name}, westward(600, 10), {resolution: 10}));
            expect(pips.length).toBeGreaterThan(0);
            for (const p of pips) expect(ringCentroidY(p)).toBeLessThan(0);
        }
    });

    it('moves them to the other side when the points are reversed', () => {
        const pips = decorations(paintMetocPath({name: N.ColdFront}, westward(600, 10).reverse(), {resolution: 10}));
        for (const p of pips) expect(ringCentroidY(p)).toBeGreaterThan(0);
    });

    it('draws a squall line’s Vs across the broken line, pointing the way the pips would', () => {
        // Drawn right to left along y = 0, as Table M-II's example: the Vs point below the line.
        const paints = paintMetocPath({name: N.SevereSquallLine}, westward(600, 10), {resolution: 10});
        const vs = paints.filter((p) => p.role === 'decoration');
        const runs = paints.filter((p) => p.role === 'line');
        expect(vs.length).toBeGreaterThan(1);
        expect(runs.length).toBe(vs.length + 1);
        for (const v of vs) {
            const [a, tip, b] = (v.geometry as {coordinates: P[]}).coordinates;
            // Arms open above the line, the point below it: a V straddling the line, not beside it.
            expect(a[1]).toBeGreaterThan(0);
            expect(b[1]).toBeGreaterThan(0);
            expect(tip[1]).toBeLessThan(0);
        }
    });

    it('points a stationary front’s warm pips one way and its cold pips the other', () => {
        const pips = decorations(paintMetocPath({name: N.StationaryFront}, westward(600, 10), {resolution: 10}));
        const warm = pips.filter((p) => p.fill?.color === DEFAULT_METOC_PALETTE.warm);
        const cold = pips.filter((p) => p.fill?.color === DEFAULT_METOC_PALETTE.cold);
        expect(warm.length).toBeGreaterThan(0);
        expect(cold.length).toBeGreaterThan(0);
        for (const p of warm) expect(ringCentroidY(p)).toBeGreaterThan(0);
        for (const p of cold) expect(ringCentroidY(p)).toBeLessThan(0);
    });
});

describe('Table M-II’s line drawings', () => {
    const res = 10;
    const strokes = (paints: Paint[]) => paints.filter((p) => p.role === 'decoration' && p.geometry.type === 'LineString').map((p) => (p.geometry as {coordinates: P[]}).coordinates);
    const ringOf = (p: Paint): P[] => (p.geometry.type === 'Polygon' ? p.geometry.coordinates[0] : (p.geometry as {coordinates: P[]}).coordinates);
    const centreOf = (p: Paint) => {
        const ring = ringOf(p);
        return ring.reduce((a, c) => [a[0] + c[0] / ring.length, a[1] + c[1] / ring.length], [0, 0]);
    };
    /** Pips (not separator dots) in order from the first point, which is on the right of a westward line. */
    const pipsFromStart = (paints: Paint[]) =>
        paints
            .filter((p) => p.role === 'decoration' && ringOf(p).length > 3)
            .filter((p) => {
                const xs = ringOf(p).map((c) => c[0]);
                return (Math.max(...xs) - Math.min(...xs)) / res > 5;
            })
            .sort((a, b) => centreOf(b)[0] - centreOf(a)[0]);

    it('crosses a frontolysis with a stroke leaning back, top left to bottom right, through a stub, whichever way it is drawn', () => {
        for (const name of [N.ColdFrontolysis, N.WarmFrontolysis, N.OccludedFrontolysis, N.StationaryFrontolysis]) {
            for (const points of [westward(600, res), westward(600, res).reverse()]) {
                const paints = paintMetocPath({name}, points, {resolution: res});
                const crosses = strokes(paints);
                expect(crosses.length).toBeGreaterThan(0);
                for (const [a, b] of crosses) {
                    expect(Math.sign(b[0] - a[0]) * Math.sign(b[1] - a[1])).toBe(-1);
                    // The stroke crosses the line itself: a short stub of line runs under its middle.
                    const mid: P = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
                    expect(Math.abs(mid[1])).toBeLessThan(1e-6);
                    const stub = paints.filter((p) => p.role === 'line').map((p) => (p.geometry as {coordinates: P[]}).coordinates).find((r) => Math.min(r[0][0], r[r.length - 1][0]) <= mid[0] && mid[0] <= Math.max(r[0][0], r[r.length - 1][0]));
                    expect(stub).toBeDefined();
                    expect(Math.abs(stub![0][0] - stub![stub!.length - 1][0]) / res).toBeLessThan(15);
                }
            }
        }
    });

    it('starts occluded and stationary fronts with the triangle at the first point', () => {
        for (const name of [N.OccludedFront, N.UpperOccludedFront, N.OccludedFrontolysis, N.StationaryFront, N.StationaryFrontogenesis, N.StationaryFrontolysis]) {
            const first = pipsFromStart(paintMetocPath({name}, westward(600, res), {resolution: res}))[0];
            expect(ringOf(first).length, name).toBe(4);
        }
        const first = pipsFromStart(paintMetocPath({name: N.StationaryFront}, westward(600, res), {resolution: res}))[0];
        expect(first.fill!.color).toBe(DEFAULT_METOC_PALETTE.cold);
    });

    it('crosses an occluded frontolysis once a pair of pips', () => {
        const paints = paintMetocPath({name: N.OccludedFrontolysis}, westward(800, res), {resolution: res});
        const pips = pipsFromStart(paints).length;
        expect(strokes(paints)).toHaveLength(Math.floor((pips - 1) / 2));
    });

    it('separates a stationary frontogenesis and frontolysis at both ends, in the colours their drawings use', () => {
        // Frontogenesis: a dot takes the colour of the pip before it; frontolysis: a stroke the colour of the pip after it.
        const dots = decorations(paintMetocPath({name: N.StationaryFrontogenesis}, westward(800, res), {resolution: res}))
            .filter((p) => ringSizePx(p, res).w <= 5)
            .sort((a, b) => centreOf(b)[0] - centreOf(a)[0]);
        expect(centreOf(dots[0])[0] / res).toBeCloseTo(800, 0);
        expect(centreOf(dots[dots.length - 1])[0] / res).toBeCloseTo(0, 0);
        expect(dots.map((d) => d.fill!.color).slice(0, 3)).toEqual([DEFAULT_METOC_PALETTE.warm, DEFAULT_METOC_PALETTE.cold, DEFAULT_METOC_PALETTE.warm]);

        const paints = paintMetocPath({name: N.StationaryFrontolysis}, westward(800, res), {resolution: res});
        const crosses = paints.filter((p) => p.role === 'decoration' && p.geometry.type === 'LineString');
        const x = (p: Paint) => ((p.geometry as {coordinates: P[]}).coordinates[0][0] + (p.geometry as {coordinates: P[]}).coordinates[1][0]) / 2;
        crosses.sort((a, b) => x(b) - x(a));
        expect(x(crosses[0]) / res).toBeCloseTo(800, 0);
        expect(x(crosses[crosses.length - 1]) / res).toBeCloseTo(0, 0);
        expect(crosses.map((c) => c.stroke!.color).slice(0, 3)).toEqual([DEFAULT_METOC_PALETTE.cold, DEFAULT_METOC_PALETTE.warm, DEFAULT_METOC_PALETTE.cold]);
    });

    it('swings a ridge axis’s zigzag equally either side of the traced axis', () => {
        const ys = (paintMetocPath({name: N.RidgeAxis}, westward(600, res), {resolution: res})[0].geometry as {coordinates: P[]}).coordinates.map((c) => c[1]);
        expect(Math.max(...ys)).toBeGreaterThan(0);
        expect(Math.max(...ys)).toBeCloseTo(-Math.min(...ys), 6);
    });

    it('breaks instability and shear lines at the crests and puts the dots there', () => {
        for (const [name, perBreak] of [
            [N.InstabilityLine, 2],
            [N.ShearLine, 1],
        ] as const) {
            const paints = paintMetocPath({name}, westward(600, res), {resolution: res});
            const runs = paints.filter((p) => p.role === 'line');
            const dots = decorations(paints);
            expect(dots.length).toBe((runs.length - 1) * perBreak);
            const crest = Math.max(...runs.flatMap((r) => (r.geometry as {coordinates: P[]}).coordinates.map((c) => Math.abs(c[1]))));
            // Each dot sits out on a crest or trough, not on the axis.
            for (const d of dots) expect(Math.abs(centreOf(d)[1])).toBeGreaterThan(crest * 0.85);
            // And each run starts and ends near a crest (or at an end of the line), never at an axis crossing mid-line.
            for (const r of runs.slice(1)) expect(Math.abs((r.geometry as {coordinates: P[]}).coordinates[0][1])).toBeGreaterThan(crest * 0.85);
        }
    });

    it('stands a convergence line’s strokes off it, alternately either side, touching it', () => {
        const paints = paintMetocPath({name: N.ConvergenceLine}, westward(600, res), {resolution: res});
        const marks = strokes(paints).sort((a, b) => b[0][0] - a[0][0]);
        expect(marks.length).toBeGreaterThan(3);
        marks.forEach(([onLine, off], i) => {
            expect(Math.abs(onLine[1])).toBeLessThan(1e-6);
            // The first stands right of the drawn direction (above a westward line), then they alternate.
            expect(Math.sign(off[1])).toBe(i % 2 === 0 ? 1 : -1);
            // Leaning back toward the first point.
            expect(off[0]).toBeGreaterThan(onLine[0]);
        });
    });
});

describe('colour', () => {
    it('uses Table M-II’s colours', () => {
        const lineColor = (name: N) => paintMetocPath({name}, westward(400, 10), {resolution: 10}).find((p) => p.role === 'line')!.stroke!.color;
        expect(lineColor(N.ColdFront)).toBe('rgb(0, 0, 255)');
        expect(lineColor(N.WarmFront)).toBe('rgb(255, 0, 0)');
        expect(lineColor(N.OccludedFront)).toBe('rgb(111, 49, 152)');
        expect(lineColor(N.ConvergenceLine)).toBe('rgb(255, 128, 0)');
    });

    it('colours a stationary front’s line in both colours, and the discontinuity in red and green', () => {
        for (const [name, roles] of [
            [N.StationaryFront, ['warm', 'cold']],
            [N.InterTropicalDiscontinuity, ['warm', 'discontinuityGreen']],
        ] as const) {
            const colors = new Set(paintMetocPath({name}, westward(600, 10), {resolution: 10}).filter((p) => p.role === 'line').map((p) => p.stroke!.color));
            expect([...colors].sort()).toEqual(roles.map((r) => DEFAULT_METOC_PALETTE[r]).sort());
        }
    });

    it('honours an operator colour only where the standard allows one', () => {
        const color = (name: N) => paintMetocPath({name, color: '#123456'}, westward(400, 10), {resolution: 10}).find((p) => p.role === 'line')!.stroke!.color;
        expect(color(N.StreamLine)).toBe('#123456');
        expect(color(N.OperatorDefinedFreeformLine)).toBe('#123456');
        expect(color(N.ColdFront)).toBe(DEFAULT_METOC_PALETTE.cold);
    });

    it('follows the host palette and line width', () => {
        configureMetoc({palette: {cold: 'navy'}, lineWidth: 3.5});
        const line = paintMetocPath({name: N.ColdFront}, westward(400, 10), {resolution: 10}).find((p) => p.role === 'line')!;
        expect(line.stroke).toMatchObject({color: 'navy', widthPx: 3.5});
    });
});

describe('dashes', () => {
    it('are a stroke property, never cut into geometry', () => {
        for (const name of [N.Isotherm, N.Isotach, N.Thickness, N.TroughAxis]) {
            const lines = paintMetocPath({name}, westward(400, 10), {resolution: 10}).filter((p) => p.role === 'line');
            expect(lines).toHaveLength(1);
            expect(lines[0].stroke!.dashPx!.length).toBeGreaterThan(0);
        }
    });

    it('dash the freeform line only when the operator asks', () => {
        const dash = (dashed?: boolean) =>
            paintMetocPath({name: N.OperatorDefinedFreeformLine, ...(dashed ? {dashed} : {})}, westward(400, 10), {resolution: 10})[0].stroke!.dashPx;
        expect(dash()).toBeUndefined();
        expect(dash(true)).toBeDefined();
    });
});

describe('isopleth values', () => {
    it('write the value at both ends and once in the middle, upright', () => {
        for (const name of listMetocGraphics().filter((n) => getMetocSpec(n).valueField && getMetocSpec(n).geometry === 'line')) {
            const labels = paintMetocPath({name, value: '1012'}, westward(600, 10).reverse(), {resolution: 10}).filter((p) => p.role === 'label');
            expect(labels).toHaveLength(3);
            for (const l of labels) {
                expect(l.text!.text).toBe('1012');
                expect(l.text!.rotation).toBeGreaterThan(-Math.PI / 2);
                expect(l.text!.rotation).toBeLessThanOrEqual(Math.PI / 2);
            }
        }
    });

    it('cut the line around the middle label', () => {
        const lines = paintMetocPath({name: N.IsobarSurface, value: '1012'}, westward(600, 10), {resolution: 10}).filter((p) => p.role === 'line');
        expect(lines).toHaveLength(2);
    });

    it('write nothing when there is no value', () => {
        expect(paintMetocPath({name: N.IsobarSurface}, westward(600, 10), {resolution: 10}).filter((p) => p.role === 'label')).toHaveLength(0);
        expect(paintMetocPath({name: N.IsobarSurface, value: '  '}, westward(600, 10), {resolution: 10}).filter((p) => p.role === 'label')).toHaveLength(0);
    });
});

describe('smoothing', () => {
    it('curves through every drawn point, ends included', () => {
        const path: P[] = [
            [0, 0],
            [1000, 1000],
            [2000, 0],
        ];
        const line = paintMetocPath({name: N.Trough}, path, {resolution: 1})[0];
        const coords = (line.geometry as {coordinates: P[]}).coordinates;
        expect(coords.length).toBeGreaterThan(3);
        expect(coords[0]).toEqual([0, 0]);
        expect(coords[coords.length - 1]).toEqual([2000, 0]);
        // Through the middle point the operator placed, not inside it as corner cutting was.
        expect(coords.some((c) => Math.hypot(c[0] - 1000, c[1] - 1000) < 1e-6)).toBe(true);
        expect(Math.max(...coords.map((c) => c[1]))).toBeCloseTo(1000, 6);
    });

    it('can be switched off', () => {
        configureMetoc({smoothLines: false});
        const line = paintMetocPath({name: N.Trough}, [[0, 0], [1000, 1000], [2000, 0]], {resolution: 1})[0];
        expect((line.geometry as {coordinates: P[]}).coordinates).toHaveLength(3);
    });
});

describe('the path walker', () => {
    it('measures along the path and slices it', () => {
        const w = walker([[0, 0], [3, 4], [3, 4], [6, 8]]);
        expect(w.length).toBeCloseTo(10);
        expect(w.at(5).point).toEqual([3, 4]);
        expect(w.slice(2.5, 7.5)).toEqual([[1.5, 2], [3, 4], [4.5, 6]]);
    });
});
