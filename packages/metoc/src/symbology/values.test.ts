import {MetocGraphicName as N, getMetocSpec} from '../core/catalog';
import {MetocCollection} from '../core/collection';
import {paintMetocGraphic, renderMetocGraphic} from '../core/render';
import {metocFeature} from '../core/types';
import {estimateTextWidth, type Paint, type ProjectedPosition as P} from '@zaes/symbology-engine';
import {displayedValue} from './values';

const paint = (name: N, value: string) => paintMetocGraphic(metocFeature(name, [[0, 0]], {value}), {resolution: 1});

describe('heights "in 3 digits" (Table M-II)', () => {
    it('pads a bare one- or two-digit height for turbulence, icing and the tropopause', () => {
        for (const name of [N.TurbulenceLight, N.TurbulenceMountainWaves, N.TropopauseLow, N.TropopauseHigh, N.TropopauseLevel]) {
            expect(displayedValue(getMetocSpec(name), '25'), name).toBe('025');
            expect(displayedValue(getMetocSpec(name), '5'), name).toBe('005');
            expect(displayedValue(getMetocSpec(name), '350'), name).toBe('350');
        }
        const icing = (Object.values(N) as N[]).filter((n) => n.startsWith('Icing') && getMetocSpec(n).geometry === 'point');
        expect(icing.length).toBeGreaterThan(0);
        for (const name of icing) expect(displayedValue(getMetocSpec(name), '80'), name).toBe('080');
    });

    it('leaves anything else as given: words, longer numbers, and pressures ("three or four digits")', () => {
        const turb = getMetocSpec(N.TurbulenceLight);
        expect(displayedValue(turb, 'FL25')).toBe('FL25');
        expect(displayedValue(turb, '2.5')).toBe('2.5');
        expect(displayedValue(turb, '1200')).toBe('1200');
        expect(displayedValue(turb, undefined)).toBeUndefined();
        expect(displayedValue(getMetocSpec(N.LowPressureCenter), '98')).toBe('98');
        expect(displayedValue(getMetocSpec(N.FreezingLevel), '25')).toBe('25');
    });

    it('draws the padded height and stores what was typed', () => {
        expect(paint(N.TurbulenceLight, '25').some((p) => p.text?.text === '025')).toBe(true);
        expect(renderMetocGraphic(metocFeature(N.TropopauseHigh, [[0, 0]], {value: '25'})).labels[0].properties!.text).toBe('025');
        const c = new MetocCollection();
        const id = c.add(metocFeature(N.TurbulenceLight, [[0, 0]], {value: '25'}));
        expect(c.get(id)!.properties.metoc.value).toBe('25');
    });
});

describe('boxed values fit their box', () => {
    /** The x extent of the symbol's closed outline: its box. */
    const boxOf = (paints: Paint[]): [number, number] => {
        const rings = paints
            .filter((p) => !p.text)
            .map((p) => (p.geometry.type === 'Polygon' ? p.geometry.coordinates[0] : (p.geometry.coordinates as P[])))
            .filter((c) => c.length >= 4 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]);
        const xs = rings.flat().map((c) => c[0]);
        return [Math.min(...xs), Math.max(...xs)];
    };
    const extent = (p: Paint): [number, number] => {
        const x = (p.geometry.coordinates as P)[0];
        const half = estimateTextWidth(p.text!.text, p.text!.sizePx) / 2;
        return [x - half, x + half];
    };

    it.each([N.FreezingLevel, N.TropopauseLevel, N.IceThicknessObserved, N.IceThicknessEstimated, N.TropopauseLow, N.TropopauseHigh])('%s grows its box to the value, clear of both sides', (name) => {
        for (const value of ['9', '100', '1000', '99999', 'FL380-450', 'SFC-120 MSL']) {
            const paints = paint(name, value);
            const [bx0, bx1] = boxOf(paints);
            for (const t of paints.filter((p) => p.text)) {
                const [x0, x1] = extent(t);
                expect(x0 - bx0, `${name} ${value} "${t.text!.text}" left`).toBeGreaterThan(1.5);
                expect(bx1 - x1, `${name} ${value} "${t.text!.text}" right`).toBeGreaterThan(1.5);
            }
        }
    });

    it('keeps the standard box for a short value', () => {
        const [bx0, bx1] = boxOf(paint(N.TropopauseLevel, '380'));
        const spec = getMetocSpec(N.TropopauseLevel);
        expect(spec.glyph).toBeDefined();
        // 20 glyph units of 1.25 px.
        expect(bx1 - bx0).toBeCloseTo(25, 6);
    });

    it('sets the freezing level\'s "0°:" and its height apart, neither touching the box (S12: "0°: 100")', () => {
        const paints = paint(N.FreezingLevel, '100');
        const [bx0, bx1] = boxOf(paints);
        const zero = extent(paints.find((p) => p.text?.text === '0°:')!);
        const height = extent(paints.find((p) => p.text?.text === '100')!);
        expect(zero[0] - bx0).toBeGreaterThan(1.5);
        expect(height[0]).toBeGreaterThan(zero[1]);
        expect(bx1 - height[1]).toBeGreaterThan(1.5);
    });
});
