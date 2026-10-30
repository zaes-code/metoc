import {DEFAULT_METOC_PALETTE, METOC_CONFIG_RANGES, configureMetoc, getMetocConfig, resetMetocConfig} from './config';

afterEach(() => resetMetocConfig());

describe('configureMetoc', () => {
    it('clamps numbers to their ranges', () => {
        configureMetoc({lineWidth: 40, pipSize: -3, labelSize: 2, areaFillOpacity: 1.5});
        const c = getMetocConfig();
        expect(c.lineWidth).toBe(METOC_CONFIG_RANGES.lineWidth[1]);
        expect(c.pipSize).toBe(METOC_CONFIG_RANGES.pipSize[0]);
        expect(c.labelSize).toBe(METOC_CONFIG_RANGES.labelSize[0]);
        expect(c.areaFillOpacity).toBe(1);
    });

    it('ignores values of the wrong kind and keeps the setting in force', () => {
        configureMetoc({lineWidth: 3, labelHalo: '#000'});
        configureMetoc({lineWidth: NaN, labelHalo: '##000', pointSize: 'huge' as never, smoothLines: 'no' as never});
        const c = getMetocConfig();
        expect(c.lineWidth).toBe(3);
        expect(c.labelHalo).toBe('#000');
        expect(c.pointSize).toBe('medium');
        expect(c.smoothLines).toBe(true);
    });

    it('takes palette colours for known roles only', () => {
        configureMetoc({palette: {cold: '#0000aa', nope: '#fff', warm: 'not a colour'} as never});
        const p = getMetocConfig().palette as Record<string, string>;
        expect(p.cold).toBe('#0000aa');
        expect(p.warm).toBe(DEFAULT_METOC_PALETTE.warm);
        expect('nope' in p).toBe(false);
    });

    it('removes the default line colour when set to undefined', () => {
        configureMetoc({defaultLineColor: '#777777'});
        expect(getMetocConfig().defaultLineColor).toBe('#777777');
        configureMetoc({defaultLineColor: undefined});
        expect('defaultLineColor' in getMetocConfig()).toBe(false);
    });
});

describe('getMetocConfig', () => {
    it('returns one frozen snapshot until the next change', () => {
        const a = getMetocConfig();
        expect(getMetocConfig()).toBe(a);
        expect(Object.isFrozen(a) && Object.isFrozen(a.palette)).toBe(true);
        configureMetoc({lineWidth: 4});
        expect(getMetocConfig()).not.toBe(a);
    });

    it('is shared through globalThis, so a second copy of the package sees the same settings', () => {
        configureMetoc({lineWidth: 5});
        const shared = (globalThis as unknown as Record<symbol, {current: {lineWidth: number}}>)[Symbol.for('@zaes/metoc/config')];
        expect(shared.current.lineWidth).toBe(5);
    });
});

describe('colours', () => {
    it('takes any colour in CSS form', () => {
        for (const c of ['#fff', '#a1b2c3d4', 'rgb(1 2 3 / 50%)', 'hsl(210, 50%, 40%)', 'oklch(0.7 0.1 200)', 'Navy']) {
            configureMetoc({labelHalo: c});
            expect(getMetocConfig().labelHalo).toBe(c);
        }
    });

    it('refuses what is not one', () => {
        for (const c of ['##ffd400', '#ff', 'not a colour', 'rgb(1, 2', '']) {
            configureMetoc({labelHalo: c});
            expect(getMetocConfig().labelHalo).toBe('rgba(255, 255, 255, 0.9)');
        }
    });
});
