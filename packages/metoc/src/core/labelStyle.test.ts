import {MetocGraphicName as N} from './catalog';
import {configureMetoc, getMetocConfig, resetMetocConfig} from './config';
import {paintMetocGraphic} from './render';
import {metocFeature} from './types';

afterEach(() => resetMetocConfig());

const texts = (f: ReturnType<typeof metocFeature>) => paintMetocGraphic(f, {resolution: 1000}).flatMap((p) => (p.text ? [p.text] : []));
const high = metocFeature(N.HighPressureCenter, [[0, 0]], {value: '1032'});
const isotherm = metocFeature(N.Isotherm, [[-10, 0], [0, 2], [10, 0]], {value: '-10'});

describe('label style', () => {
    it('labelColor recolours labels, never a symbol\'s own text', () => {
        configureMetoc({labelColor: '#123456'});
        const t = texts(high);
        expect(t.find((x) => x.text === '1032')!.color).toBe('#123456');
        expect(t.find((x) => x.text === 'H')!.color).not.toBe('#123456');
        expect(texts(isotherm).every((x) => x.color === '#123456')).toBe(true);
    });

    it('showLabels off drops the labels and keeps the symbol', () => {
        configureMetoc({showLabels: false});
        expect(texts(high).map((x) => x.text)).toEqual(['H']);
        expect(texts(isotherm)).toEqual([]);
        expect(paintMetocGraphic(isotherm, {resolution: 1000}).length).toBeGreaterThan(0);
    });

    it('labelFont and labelHaloWidth reach every text mark', () => {
        configureMetoc({labelFont: '"Roboto Condensed", Arial, sans-serif', labelHaloWidth: 0});
        for (const t of texts(high)) expect(t).toMatchObject({fontFamily: '"Roboto Condensed", Arial, sans-serif', haloPx: 0});
    });

    it('leaves text untouched at the defaults', () => {
        for (const t of texts(high)) {
            expect(t.fontFamily).toBeUndefined();
            expect(t.haloPx).toBeUndefined();
        }
    });

    it('refuses a font that is not a family list, and a blank one clears it', () => {
        configureMetoc({labelFont: 'Arial'});
        configureMetoc({labelFont: 'Arial; color: red'});
        expect(getMetocConfig().labelFont).toBe('Arial');
        configureMetoc({labelFont: ' '});
        expect(getMetocConfig().labelFont).toBeUndefined();
    });
});
