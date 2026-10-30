import {MetocCollection, MetocGraphicName as N, metocFeature, paintMetocGraphic, toMercator, validateMetocFeature, type MetocFeature} from '../index';
import {stationChangeCode, stationPressureCode} from './pointPaints';

const station = (extra: Record<string, unknown> = {}): MetocFeature =>
    ({...metocFeature(N.StationPlot, [[-97, 38]], {windDirection: 290, windSpeed: 25, ...extra} as never), id: 's1'}) as MetocFeature;
const texts = (f: MetocFeature) =>
    paintMetocGraphic(f, {resolution: 1000})
        .filter((p) => p.text)
        .map((p) => p.text!.text);
/** Each text's place relative to the station, in CSS pixels: [right, up]. */
const where = (f: MetocFeature, value: string) => {
    const o = toMercator([-97, 38]);
    const p = paintMetocGraphic(f, {resolution: 1000}).find((q) => q.text?.text === value)!;
    const [x, y] = p.geometry.coordinates as number[];
    return [(x - o[0]) / 1000, (y - o[1]) / 1000];
};

describe('the station plot', () => {
    it('writes the pressure as the station model does: tenths of a hectopascal, last three digits', () => {
        expect(stationPressureCode(1013.2)).toBe('132');
        expect(stationPressureCode(998.7)).toBe('987');
        expect(stationPressureCode(1000.04)).toBe('000');
        expect(stationChangeCode(1.9)).toBe('19');
        expect(stationChangeCode(-0.3)).toBe('03');
    });

    it('places each value where the station model puts it', () => {
        const f = station({temperature: 24, dewPoint: 18, pressure: 1013.2, pressureChange: 1.9});
        expect(texts(f).sort()).toEqual(['132', '18', '19', '24']);
        const [tx, ty] = where(f, '24');
        const [dx, dy] = where(f, '18');
        const [px, py] = where(f, '132');
        const [cx, cy] = where(f, '19');
        // Temperature upper left, dew point lower left, pressure upper right, the change right and level.
        expect(tx < 0 && ty > 0).toBe(true);
        expect(dx < 0 && dy < 0).toBe(true);
        expect(px > 0 && py > 0).toBe(true);
        expect(cx > 0 && Math.abs(cy) < 1).toBe(true);
    });

    it('leaves out what is missing, and draws an empty plot circle for a missing sky cover', () => {
        const bare = paintMetocGraphic(station(), {resolution: 1000});
        expect(bare.some((p) => p.text)).toBe(false);
        // The empty circle and the barb: line work only, no fill.
        expect(bare.every((p) => !p.fill)).toBe(true);
        const overcast = paintMetocGraphic(station({cloudCover: 'CloudOvercast'}), {resolution: 1000});
        expect(overcast.some((p) => p.fill)).toBe(true);
    });

    it('draws its weather and tendency symbols in their own colours, and needs no wind', () => {
        const f = station({weather: 'RainContinuousModerate', pressureTendency: 'PressureRise', pressureChange: 1});
        const colours = new Set(paintMetocGraphic(f, {resolution: 1000}).flatMap((p) => [p.fill?.color, p.stroke?.color]).filter(Boolean));
        expect(colours.size).toBeGreaterThan(2);
        const calm = {...metocFeature(N.StationPlot, [[-97, 38]], {temperature: 10} as never), id: 'c'} as MetocFeature;
        expect(validateMetocFeature(calm)).toEqual([]);
        expect(texts(calm)).toEqual(['10']);
    });

    it('keeps its observation when saved, and drops a symbol of the wrong kind', () => {
        const c = new MetocCollection();
        c.add(station({cloudCover: 'CloudBroken', weather: 'ColdFront', pressureTendency: 'PressureFall', temperature: -4, pressure: 'x'}));
        const p = c.list()[0].properties.metoc;
        expect(p).toMatchObject({cloudCover: 'CloudBroken', pressureTendency: 'PressureFall', temperature: -4});
        expect(p.weather).toBeUndefined();
        expect(p.pressure).toBeUndefined();
    });
});
