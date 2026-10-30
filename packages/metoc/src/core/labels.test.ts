import {MetocGraphicName as N, getMetocSpec, metocFeature, paintMetocGraphic, type MetocGraphicName} from '../index.js';

/**
 * The labels Tables M-II and M-III document, pinned from the standard's notes column (an audit of
 * every row). Update this from the standard, never from the catalog.
 */
const HEIGHT_IN_HUNDREDS_OF_FEET: MetocGraphicName[] = [
    N.TurbulenceLight,
    N.TurbulenceModerate,
    N.TurbulenceSevere,
    N.TurbulenceExtreme,
    N.TurbulenceMountainWaves,
    N.IcingClearLight,
    N.IcingClearModerate,
    N.IcingClearSevere,
    N.IcingRimeLight,
    N.IcingRimeModerate,
    N.IcingRimeSevere,
    N.IcingMixedLight,
    N.IcingMixedModerate,
    N.IcingMixedSevere,
];
/** "The modifier text will be placed at each end of the line and once in the middle of the line." */
const ENDS_AND_MIDDLE: MetocGraphicName[] = [N.IsobarSurface, N.Isotherm, N.Isotach, N.Isodrosotherm, N.Thickness];
/** "… at each end of the line and at regular intervals along the line." */
const ENDS_AND_INTERVALS: MetocGraphicName[] = [N.DepthCurve, N.DepthContour];

const texts = (name: MetocGraphicName, points: number[][], value: string, resolution: number) =>
    paintMetocGraphic(metocFeature(name, points, {value}), {resolution})
        .filter((p) => p.text)
        .map((p) => p.text!.text);

describe('labels the standard documents', () => {
    it.each(HEIGHT_IN_HUNDREDS_OF_FEET)('%s carries its height in three digits, drawn with the symbol', (name) => {
        expect(getMetocSpec(name).valueField?.label).toMatch(/height/i);
        expect(texts(name, [[-97, 38]], '250', 1000)).toEqual(['250']);
        // Absent means no label, never an empty one.
        expect(texts(name, [[-97, 38]], '', 1000)).toEqual([]);
    });

    it.each(ENDS_AND_MIDDLE)('%s writes its value at both ends and once in the middle', (name) => {
        expect(texts(name, [[-100, 40], [-95, 41], [-90, 40]], '1004', 1000)).toEqual(['1004', '1004', '1004']);
    });

    it.each(ENDS_AND_INTERVALS)('%s writes its depth at both ends and at regular intervals', (name) => {
        expect(getMetocSpec(name).valueField?.label).toBe('Depth');
        const long = texts(name, [[-100, 40], [-95, 41], [-90, 40]], '20', 1000);
        expect(long.length).toBeGreaterThan(3);
        expect(new Set(long)).toEqual(new Set(['20']));
        // Short on screen, the inner labels thin out to the middle one and then to none.
        expect(texts(name, [[-100, 40], [-99.9, 40]], '20', 1000).length).toBeLessThan(long.length);
    });
});
