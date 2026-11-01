import {MetocGraphicName as N} from '../core/catalog';
import {DEFAULT_METOC_PALETTE, configureMetoc, resetMetocConfig} from '../core/config';
import {estimateTextWidth, type Paint, pointInRing, type ProjectedPosition as P} from '@zaes/symbology-engine';
import {paintMetocPath, paintedPath} from '../core/render';
import {MIN_LABEL_PX, interiorPoint} from './areaPaints';

afterEach(() => resetMetocConfig());

/** A square `px` pixels on a side at `res`, traced anticlockwise (or clockwise). */
const square = (px: number, res: number, clockwise = false): P[] => {
    const s = px * res;
    const ring: P[] = [
        [0, 0],
        [s, 0],
        [s, s],
        [0, s],
    ];
    return clockwise ? ring.reverse() : ring;
};
const res = 100;
const paint = (name: N, extra: object = {}, ring = square(300, res)) => paintMetocPath({name, ...extra}, ring, {resolution: res});
const of = (paints: Paint[], role: Paint['role']) => paints.filter((p) => p.role === role);
const centre: P = [150 * res, 150 * res];
const coords = (p: Paint) => p.geometry.coordinates as unknown as P[] | P[][];

describe('outlines (Table M-II)', () => {
    it('closes the ring', () => {
        configureMetoc({smoothLines: false});
        const [line] = of(paint(N.InstrumentFlightRule), 'line');
        const c = coords(line) as P[];
        expect(c[0]).toEqual(c[c.length - 1]);
        expect(line.stroke!.dashPx).toBeUndefined();
    });

    it('uses the standard colours', () => {
        const color = (n: N) => paint(n).find((p) => p.stroke || p.fill)!;
        expect(color(N.InstrumentFlightRule).stroke!.color).toBe(DEFAULT_METOC_PALETTE.warm);
        expect(color(N.MarginalVisualFlightRule).stroke!.color).toBe(DEFAULT_METOC_PALETTE.cold);
        expect(color(N.Turbulence).fill!.color).toBe(DEFAULT_METOC_PALETTE.cold);
        expect(color(N.Icing).stroke!.color).toBe(DEFAULT_METOC_PALETTE.brown);
        expect(color(N.LiquidPrecipitation).stroke!.color).toBe(DEFAULT_METOC_PALETTE.green);
        expect(color(N.Fog).stroke!.color).toBe(DEFAULT_METOC_PALETTE.yellow);
    });

    it('dash-dots the convective precipitation and thunderstorm areas', () => {
        for (const n of [N.ConvectivePrecipitation, N.Thunderstorm]) expect(of(paint(n), 'line')[0].stroke!.dashPx).toEqual([12, 5, 2, 5]);
    });

    it('draws turbulence as a ring of dots with no line', () => {
        const paints = paint(N.Turbulence);
        expect(of(paints, 'line')).toHaveLength(0);
        expect(paints.length).toBeGreaterThan(20);
        expect(paints.every((p) => p.geometry.type === 'Polygon' && p.fill)).toBe(true);
    });

    it('scallops MVFR outward, whichever way round the area was traced', () => {
        // Unsmoothed, so the ring the scallops ride is the square they are tested against.
        configureMetoc({smoothLines: false});
        for (const clockwise of [false, true]) {
            const ring = square(300, res, clockwise);
            const [line] = of(paint(N.MarginalVisualFlightRule, {}, ring), 'line');
            const pts = coords(line) as P[];
            const outside = pts.filter((p) => !pointInRing(p, ring)).length;
            expect(outside / pts.length).toBeGreaterThan(0.6);
        }
    });

    it('ticks icing inward, whichever way round the area was traced', () => {
        for (const clockwise of [false, true]) {
            const ring = square(300, res, clockwise);
            const ticks = of(paint(N.Icing, {}, ring), 'decoration');
            expect(ticks.length).toBeGreaterThan(5);
            // Inward of the outline as painted, which curves through the square's corners.
            const outline = paintedPath(ring, true);
            for (const t of ticks) expect(pointInRing((coords(t) as P[])[1], outline)).toBe(true);
        }
    });

    it('keeps decoration screen-sized', () => {
        const dotPx = (r: number) => {
            const d = paintMetocPath({name: N.Turbulence}, square(300, r), {resolution: r})[0];
            const ring = (coords(d) as P[][])[0];
            return (Math.max(...ring.map((c) => c[0])) - Math.min(...ring.map((c) => c[0]))) / r;
        };
        expect(dotPx(10)).toBeCloseTo(dotPx(10000), 6);
    });

    it('dashes the freeform area only when asked, and takes the operator colour', () => {
        expect(of(paint(N.OperatorDefinedFreeformArea), 'line')[0].stroke!.dashPx).toBeUndefined();
        const dashed = of(paint(N.OperatorDefinedFreeformArea, {dashed: true, color: '#00ff00'}), 'line')[0];
        expect(dashed.stroke).toMatchObject({color: '#00ff00', dashPx: [10, 6]});
        expect(of(paint(N.Fog, {color: '#00ff00'}), 'line')[0].stroke!.color).toBe(DEFAULT_METOC_PALETTE.yellow);
    });
});

describe('Area2 fill', () => {
    it('fills with no outer boundary line', () => {
        const paints = paint(N.InstrumentFlightRule, {filled: true});
        expect(of(paints, 'line')).toHaveLength(0);
        const [fill] = paints;
        expect(fill.fill).toEqual({color: DEFAULT_METOC_PALETTE.warm, opacity: 0.35});
    });

    it('is not offered on the Area1 wind area', () => {
        expect(of(paint(N.TropicalStormWindArea, {filled: true}), 'line').length).toBeGreaterThan(0);
    });
});

describe('labels', () => {
    it('centres the freeform area value inside the area', () => {
        const [label] = of(paint(N.OperatorDefinedFreeformArea, {value: 'AREA A'}), 'label');
        expect(label.text!.text).toBe('AREA A');
        const [x, y] = label.geometry.coordinates as P;
        expect(x).toBeCloseTo(centre[0], 6);
        expect(y).toBeCloseTo(centre[1], 6);
        expect(label.text!.rotation).toBe(0);
    });

    it('shrinks a centred label to fit the area, and drops it when unreadable', () => {
        const big = of(paint(N.OperatorDefinedFreeformArea, {value: 'A LONG AREA NAME'}, square(400, res)), 'label')[0];
        const small = of(paint(N.OperatorDefinedFreeformArea, {value: 'A LONG AREA NAME'}, square(80, res)), 'label')[0];
        expect(small.text!.sizePx).toBeLessThan(big.text!.sizePx);
        expect(of(paint(N.OperatorDefinedFreeformArea, {value: 'A LONG AREA NAME'}, square(20, res)), 'label')).toHaveLength(0);
        expect(small.text!.sizePx).toBeGreaterThanOrEqual(MIN_LABEL_PX);
    });

    it('puts the wind radius on the outline at the top, in a gap', () => {
        configureMetoc({smoothLines: false});
        const paints = paint(N.TropicalStormWindArea, {value: '34 KT'});
        const [label] = of(paints, 'label');
        expect((label.geometry.coordinates as unknown as P)[1]).toBeCloseTo(300 * res, 6);
        expect(of(paints, 'line').length).toBeGreaterThan(0);
        const total = of(paints, 'line').reduce((n, p) => n + (coords(p) as P[]).length, 0);
        expect(total).toBeGreaterThan(5);
    });

    it('boxes the date-time label at the outline’s upper left, within the area’s bounds, with a leader into the area', () => {
        // A storm's wind area: a circle 300 px across. The box stands in the corner of its bounds,
        // clear of the outline, as Table M-II draws it — not beyond the bounds.
        const circle: P[] = Array.from({length: 64}, (_, i) => [(150 + 150 * Math.cos((2 * Math.PI * i) / 64)) * res, (150 + 150 * Math.sin((2 * Math.PI * i) / 64)) * res] as P);
        const paints = paint(N.TropicalStormWindArea, {dtg: '221800Z'}, circle);
        const label = of(paints, 'label').find((p) => p.text!.boxColor)!;
        expect(label.text!.text).toBe('221800Z');
        const [x, y] = label.geometry.coordinates as unknown as P;
        const halfW = (estimateTextWidth('221800Z', label.text!.sizePx) / 2 + 4) * res;
        const halfH = (label.text!.sizePx * 0.75 + 3) * res;
        const ring = paintedPath(circle, true);
        for (const [fx, fy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
            const corner: P = [x + fx * halfW, y + fy * halfH];
            expect(corner[0]).toBeGreaterThanOrEqual(-1e-6);
            expect(corner[1]).toBeLessThanOrEqual(300 * res + 1e-6);
            expect(pointInRing(corner, ring)).toBe(false);
        }
        expect(x).toBeLessThan(centre[0]);
        expect(y).toBeGreaterThan(centre[1]);
        const leader = of(paints, 'decoration').find((p) => p.stroke?.widthPx === 1)!;
        expect(pointInRing((coords(leader) as P[])[1], ring)).toBe(true);
    });

    it('stands the date-time box just off the outline where the area fills its corner', () => {
        const paints = paint(N.TropicalStormWindArea, {dtg: '221800Z'});
        const label = of(paints, 'label').find((p) => p.text!.boxColor)!;
        const [x, y] = label.geometry.coordinates as unknown as P;
        const halfW = (estimateTextWidth('221800Z', label.text!.sizePx) / 2 + 4) * res;
        const halfH = (label.text!.sizePx * 0.75 + 3) * res;
        const ring = paintedPath(square(300, res), true);
        const edge = ring.reduce((b, p) => (p[1] - p[0] > b[1] - b[0] ? p : b));
        // Its lower-right corner a few pixels up and left of the outline's upper-left point: at the edge, not off in the distance.
        expect((edge[0] - (x + halfW)) / res).toBeCloseTo(3, 6);
        expect((y - halfH - edge[1]) / res).toBeCloseTo(3, 6);
        expect(pointInRing([x + halfW, y - halfH], ring)).toBe(false);
    });

    it('draws no box and no label when the fields are absent or blank', () => {
        expect(of(paint(N.TropicalStormWindArea), 'label')).toHaveLength(0);
        expect(of(paint(N.TropicalStormWindArea, {dtg: '  ', value: ''}), 'label')).toHaveLength(0);
    });
});

describe('interiorPoint', () => {
    it('stays inside a crescent whose centroid is outside it', () => {
        const ring: P[] = [];
        for (let i = 0; i <= 20; i++) ring.push([Math.cos((Math.PI * i) / 20) * 100, Math.sin((Math.PI * i) / 20) * 100]);
        for (let i = 20; i >= 0; i--) ring.push([Math.cos((Math.PI * i) / 20) * 80, Math.sin((Math.PI * i) / 20) * 80]);
        ring.push(ring[0]);
        expect(pointInRing(interiorPoint(ring), ring)).toBe(true);
    });
});
