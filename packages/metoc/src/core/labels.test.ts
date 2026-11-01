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
/** Soundings: the depth figure is the symbol itself (Table M-III draws "6" over "3", no other mark). */
const THE_VALUE_IS_THE_SYMBOL: MetocGraphicName[] = [N.Soundings];
/**
 * Ice thickness: the row documents no text and draws an empty box ("Box with Black Outline" or
 * "... Dashed Line"). The box is where a thickness goes, so the catalog offers one, written inside;
 * with none the box is drawn empty.
 */
const VALUE_IN_THE_BOX: MetocGraphicName[] = [N.IceThicknessObserved, N.IceThicknessEstimated];

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

    it.each(THE_VALUE_IS_THE_SYMBOL)('%s draws its depth as the symbol, and nothing without one', (name) => {
        expect(getMetocSpec(name).valueField?.label).toBe('Depth');
        expect(texts(name, [[-70, 40]], '63', 1000)).toEqual(['63']);
        expect(texts(name, [[-70, 40]], '', 1000)).toEqual([]);
    });

    it.each(VALUE_IN_THE_BOX)('%s writes a thickness inside its box only when one is given', (name) => {
        expect(getMetocSpec(name).valueField?.label).toMatch(/thickness/i);
        expect(texts(name, [[-60, 75]], '30', 1000)).toEqual(['30']);
        expect(texts(name, [[-60, 75]], '', 1000)).toEqual([]);
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
