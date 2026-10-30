import {
    MetocGraphicName as N,
    WORLD_WIDTH,
    continuousLonLat,
    drawnPoints,
    metocFeature,
    nearestWorldX,
    paintMetocGraphic,
    validateMetocFeature,
    wrapLongitude,
    type MetocFeature,
} from '../index.js';

/** Widest x span of a graphic's marks, in projected meters. */
function span(f: MetocFeature, resolution = 1000): number {
    const xs = paintMetocGraphic(f, {resolution}).flatMap((p) => {
        const g = p.geometry;
        return g.type === 'Point' ? [g.coordinates[0]] : g.type === 'LineString' ? g.coordinates.map((q) => q[0]) : g.coordinates.flat().map((q) => q[0]);
    });
    return Math.max(...xs) - Math.min(...xs);
}

/** A feature as a file from elsewhere holds it: longitudes folded into ±180, either side of the antimeridian. */
const folded = (f: MetocFeature, lons: number[]): MetocFeature => {
    const g = f.geometry;
    if (g.type === 'LineString') return {...f, geometry: {type: 'LineString', coordinates: g.coordinates.map((p, i) => [lons[i], p[1]])}};
    if (g.type === 'Polygon') return {...f, geometry: {type: 'Polygon', coordinates: [g.coordinates[0].map((p, i) => [lons[i % lons.length], p[1]])]}};
    return f;
};

describe('the antimeridian', () => {
    it('wraps and unwraps longitudes', () => {
        expect(wrapLongitude(181)).toBe(-179);
        expect(wrapLongitude(-181)).toBe(179);
        expect(wrapLongitude(540)).toBe(-180);
        expect(continuousLonLat([[179, 0], [-179, 1], [-177, 2]])).toEqual([[179, 0], [181, 1], [183, 2]]);
        expect(continuousLonLat([[190, 0], [-170, 1]])).toEqual([[-170, 0], [-170, 1]]);
        expect(nearestWorldX(WORLD_WIDTH * 0.49 + WORLD_WIDTH, WORLD_WIDTH / 2)).toBeCloseTo(WORLD_WIDTH * 0.49);
    });

    it('saves a graphic built across it continuously, the first point in range', () => {
        const f = metocFeature(N.ColdFront, [[178, 10], [-179, 12], [-176, 10]]);
        expect(drawnPoints(f)).toEqual([[178, 10], [181, 12], [184, 10]]);
        const area = metocFeature(N.Thunderstorm, [[179, 0], [-179, 0], [-179, 2], [179, 2]]);
        expect(drawnPoints(area).map((p) => p[0])).toEqual([179, 181, 181, 179]);
    });

    it.each([
        ['a front', metocFeature(N.ColdFront, [[178, 10], [180, 12], [184, 10]]), [178, 180, -176]],
        ['an isobar', metocFeature(N.IsobarSurface, [[178, 10], [181, 12], [184, 10]], {value: '1004'}), [178, -179, -176]],
        ['a scalloped area', metocFeature(N.MarginalVisualFlightRule, [[179, 0], [181, 0], [181, 2], [179, 2]]), [179, -179, -179, 179]],
        ['the ITCZ band', metocFeature(N.InterTropicalConvergenceZone, [[175, 0], [185, 1], [185, 4], [175, 3]]), [175, -175, -175, 175]],
    ])('paints %s from a file folded into ±180 the short way', (_, f, lons) => {
        const fromFile = folded(f, lons);
        // A few degrees wide either way, not 360.
        expect(span(fromFile)).toBeLessThan(2e6);
        expect(span(fromFile)).toBeCloseTo(span(f), -3);
    });

    it('does not call an area that crosses it self-crossing', () => {
        const fromFile = folded(metocFeature(N.Fog, [[179, 0], [181, 0], [181, 2], [179, 2]]), [179, -179, -179, 179]);
        expect(validateMetocFeature(fromFile)).toEqual([]);
    });
});
