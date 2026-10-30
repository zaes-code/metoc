import {MetocCollection, MetocGraphicName as N, configureMetoc, metocFeature, paintMetocGraphic, resetMetocConfig, toMercator, type MetocFeature} from '../index.js';

afterEach(() => resetMetocConfig());

/** How far a graphic's marks reach from its anchor, in CSS pixels at `res`. */
function reachPx(f: MetocFeature, res = 1000): number {
    const anchor = toMercator((f.geometry as {coordinates: number[]}).coordinates);
    const coords = paintMetocGraphic(f, {resolution: res}).flatMap((p) => (p.geometry.type === 'Point' ? [p.geometry.coordinates] : p.geometry.type === 'LineString' ? p.geometry.coordinates : p.geometry.coordinates.flat()));
    return Math.max(...coords.map((c) => Math.hypot(c[0] - anchor[0], c[1] - anchor[1]) / res));
}

describe('point graphic sizes', () => {
    const at = (size?: 'small' | 'medium' | 'large') => metocFeature(N.WindBarb, [[-97, 38]], {windDirection: 270, windSpeed: 35, ...(size ? {size} : {})});

    it('draws small, medium and large at ×0.75, ×1 and ×1.5, barbs included', () => {
        const medium = reachPx(at());
        expect(reachPx(at('medium'))).toBeCloseTo(medium, 6);
        expect(reachPx(at('small'))).toBeCloseTo(medium * 0.75, 6);
        expect(reachPx(at('large'))).toBeCloseTo(medium * 1.5, 6);
    });

    it('takes the configured size when a graphic states none, and its own over it', () => {
        const medium = reachPx(at());
        configureMetoc({pointSize: 'large'});
        expect(reachPx(at())).toBeCloseTo(medium * 1.5, 6);
        expect(reachPx(at('small'))).toBeCloseTo(medium * 0.75, 6);
    });

    it('scales letters and strokes with the symbol', () => {
        const high = (size?: 'small' | 'large') => metocFeature(N.HighPressureCenter, [[-97, 38]], {value: '1024', ...(size ? {size} : {})});
        const px = (f: MetocFeature) => paintMetocGraphic(f, {resolution: 1000}).map((p) => p.text?.sizePx ?? p.stroke?.widthPx);
        const medium = px(high()) as number[];
        expect(px(high('large'))).toEqual(medium.map((v) => v * 1.5));
        expect(px(high('small'))).toEqual(medium.map((v) => v * 0.75));
        const barb = (size?: 'large') => paintMetocGraphic(at(size), {resolution: 1000}).flatMap((p) => (p.stroke ? [p.stroke.widthPx] : []));
        expect(barb('large')).toEqual(barb().map((v) => v * 1.5));
    });

    it('leaves lines and areas alone', () => {
        const front = metocFeature(N.ColdFront, [[-98, 38], [-96, 38.5]]);
        const before = paintMetocGraphic(front, {resolution: 1000});
        configureMetoc({pointSize: 'large'});
        expect(paintMetocGraphic({...front, properties: {metoc: {...front.properties.metoc, size: 'large'}}}, {resolution: 1000})).toEqual(before);
    });

    it('is saved, and an unknown size is dropped', () => {
        const c = new MetocCollection();
        c.add(at('large'));
        c.add({...at(), properties: {metoc: {...at().properties.metoc, size: 'huge' as never}}});
        expect(c.list().map((f) => f.properties.metoc.size)).toEqual(['large', undefined]);
    });
});
