import {describe, expect, it} from 'vitest';
import {MetocGraphicName as N} from '../core/catalog';
import {configureMetoc, resetMetocConfig} from '../core/config';
import {paintMetocGraphic} from '../core/render';
import {metocFeature} from '../core/types';
import {concentrationFigure, eggCodeOf, formFigure, stageFigure} from './eggCode';

// The WMO egg figures (WMO No. 259; SIGRID-3, JCOMM TR-23, Tables 4.1-4.3; the DMI egg sheet).
describe('the egg code figures', () => {
    it('writes concentrations in tenths, 9+ and 10, and ranges low to high', () => {
        expect([10, 50, 90, 91, 92, 99, 13, 79, 81].map(concentrationFigure)).toEqual(['1', '5', '9', '9+', '10', 'X', '1-3', '7-9', '8-10']);
        // No ice: ice free, open water, bergy water.
        expect([1, 2, 3].map(concentrationFigure)).toEqual([undefined, undefined, undefined]);
    });

    it('writes stages as the WMO figures, the thicker ones dotted', () => {
        expect([81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 93, 95, 96, 97, 98, 99].map(stageFigure)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '1•', '4•', '7•', '8•', '9•', '▲', 'X']);
        expect([1, 70, 80].map(stageFigure)).toEqual([undefined, undefined, undefined]);
    });

    it('writes forms 0 (pancake) to 9 (growlers), ▲ for icebergs', () => {
        expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 99].map(formFigure)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '▲', 'X']);
    });
});

describe('eggCodeOf', () => {
    it('reads an area of three stages', () => {
        expect(
            eggCodeOf({totalConcentration: 91, partialConcentration: '50, 30, 10', iceStageofDevelopment: '95, 91, 85', floeSizes: '6, 5, 4'}),
        ).toEqual({total: '9+', partial: ['5', '3', '1'], stages: ['7•', '1•', '5'], forms: ['5', '4', '3']});
    });

    it('leaves the partial concentrations out of a one-stage area', () => {
        expect(eggCodeOf({totalConcentration: 46, partialConcentration: 46, iceStageofDevelopment: 86, floeSizes: 9})).toEqual({total: '4-6', partial: [], stages: ['6'], forms: ['8']});
    });

    it('draws no egg where there is no ice or no data', () => {
        expect(eggCodeOf(undefined)).toBeUndefined();
        expect(eggCodeOf({})).toBeUndefined();
        expect(eggCodeOf({totalConcentration: 2})).toBeUndefined();
    });
});

describe('an S-411 ice area', () => {
    const ring = [[-70, 40], [-60, 40], [-60, 48], [-70, 48]];
    const s100 = {totalConcentration: 91, partialConcentration: '50, 30, 10', iceStageofDevelopment: '95, 91, 85', floeSizes: '6, 5, 4'};
    const texts = (resolution: number, extra = {}) =>
        paintMetocGraphic({...metocFeature(N.S411VeryClosePack, ring, {s100, ...extra}), id: 'i'}, {resolution})
            .filter((p) => p.text)
            .map((p) => p.text!.text);

    it('carries its egg where it fits', () => {
        expect(texts(500)).toEqual(['9+', '5', '3', '1', '7•', '1•', '5', '5', '4', '3']);
    });

    it('leaves the egg out where the area is too small to hold it, and when labels are hidden', () => {
        expect(texts(100000)).toEqual([]);
        configureMetoc({showLabels: false});
        try {
            expect(texts(500)).toEqual([]);
        } finally {
            resetMetocConfig();
        }
    });

    it('has no egg when drawn by hand, with no S-411 data', () => {
        expect(paintMetocGraphic({...metocFeature(N.S411VeryClosePack, ring), id: 'h'}, {resolution: 500}).some((p) => p.text)).toBe(false);
    });
});
