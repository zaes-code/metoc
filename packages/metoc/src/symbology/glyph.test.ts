import type {GlyphDef} from '../core/specTypes';
import type {ProjectedPosition as P} from '@zaes/symbology-engine';
import {GLYPH_PX, paintGlyph, parsePath} from './glyph';

describe('parsePath', () => {
    it('reads absolute and relative lines, H, V and Z', () => {
        const [s] = parsePath('M2 2 L10 2 v8 h-8 z');
        expect(s.closed).toBe(true);
        expect(s.points).toEqual([
            [2, 2],
            [10, 2],
            [10, 10],
            [2, 10],
            [2, 2],
        ]);
    });

    it('treats extra pairs after M as line-tos, and starts a new subpath on each M', () => {
        const subs = parsePath('M0 0 4 0 4 4 M10 10 l2 0');
        expect(subs).toHaveLength(2);
        expect(subs[0].points).toHaveLength(3);
        expect(subs[1].points[1]).toEqual([12, 10]);
    });

    it('flattens cubic and quadratic curves through their end points', () => {
        const [c] = parsePath('M0 0 C0 10 10 10 10 0');
        expect(c.points[c.points.length - 1]).toEqual([10, 0]);
        expect(Math.max(...c.points.map((p) => p[1]))).toBeCloseTo(7.5, 1);
        const [q] = parsePath('M0 0 Q5 10 10 0 T20 0');
        expect(q.points[q.points.length - 1]).toEqual([20, 0]);
        expect(Math.min(...q.points.map((p) => p[1]))).toBeLessThan(-4);
    });

    it('draws a full circle from two arcs, at its radius', () => {
        const [s] = parsePath('M2 12 A10 10 0 1 0 22 12 A10 10 0 1 0 2 12 Z');
        for (const [x, y] of s.points) expect(Math.hypot(x - 12, y - 12)).toBeCloseTo(10, 6);
    });

    it('reads numbers run together, as icon tools write them', () => {
        const [s] = parsePath('M1.5-2.5l.5.5');
        expect(s.points).toEqual([
            [1.5, -2.5],
            [2, -2],
        ]);
    });
});

describe('paintGlyph', () => {
    const glyph: GlyphDef = {
        parts: [
            {d: 'M12 2 L22 22 L2 22 Z', fill: 'main'},
            {circle: [12, 12, 3], stroke: 'black'},
            {text: '$value', x: 12, y: 30, size: 8},
        ],
    };

    it('places the box centre on the anchor, y up, screen-sized', () => {
        const res = 10;
        const [tri] = paintGlyph(glyph, {at: [1000, 1000], resolution: res, main: 'red'});
        const ring = (tri.geometry as {coordinates: P[][]}).coordinates[0];
        // The apex at box (12, 2) is 10 units above the centre.
        expect(ring[0]).toEqual([1000, 1000 + 10 * GLYPH_PX * res]);
        expect(tri.fill!.color).toBe('red');
    });

    it('turns with a rotation', () => {
        const [tri] = paintGlyph(glyph, {at: [0, 0], resolution: 1, main: 'red', rotation: Math.PI / 2});
        const apex = (tri.geometry as {coordinates: P[][]}).coordinates[0][0];
        expect(apex[0]).toBeCloseTo(-10 * GLYPH_PX, 6);
        expect(apex[1]).toBeCloseTo(0, 6);
    });

    it('writes the value where asked, and nothing without one', () => {
        expect(paintGlyph(glyph, {at: [0, 0], resolution: 1, main: 'red'}).some((p) => p.text)).toBe(false);
        const label = paintGlyph(glyph, {at: [0, 0], resolution: 1, main: 'red', value: '998'}).find((p) => p.text)!;
        expect(label.text!.text).toBe('998');
        expect(label.text!.sizePx).toBeCloseTo(8 * GLYPH_PX, 6);
    });
});
