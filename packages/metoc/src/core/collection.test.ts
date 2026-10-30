import {MetocGraphicName as N} from './catalog';
import {MetocCollection} from './collection';
import {drawnPoints, flipMetocFeature, metocFeature} from './types';

const line = (): [number, number][] => [
    [-90, 30],
    [-80, 32],
    [-70, 31],
];

describe('MetocCollection', () => {
    it('saves one feature per graphic and loads it back identical', () => {
        const a = new MetocCollection();
        a.add(metocFeature(N.IsobarSurface, line(), {value: '1012'}));
        a.add(metocFeature(N.StreamLine, line(), {color: '#00ff00'}));
        const saved = JSON.parse(JSON.stringify(a.toGeoJSON()));
        const b = new MetocCollection();
        const {loaded, skipped} = b.load(saved);
        expect(skipped).toEqual([]);
        expect(loaded).toHaveLength(2);
        expect(b.toGeoJSON()).toEqual(a.toGeoJSON());
    });

    it('keeps the drawn point order, which is what sets a front’s side', () => {
        const c = new MetocCollection();
        const id = c.add(flipMetocFeature(metocFeature(N.ColdFront, line())));
        expect(drawnPoints(c.get(id)!)).toEqual([...line()].reverse());
    });

    it('saves nothing a renderer might have stamped', () => {
        const c = new MetocCollection();
        const f = metocFeature(N.ColdFront, line());
        (f.properties.metoc as unknown as Record<string, unknown>).resolution = 123;
        (f.properties as unknown as Record<string, unknown>).role = 'graphic';
        const id = c.add(f);
        expect(c.get(id)!.properties).toEqual({metoc: {name: N.ColdFront}});
    });

    it('skips and reports what it cannot load, and loads the rest', () => {
        const c = new MetocCollection();
        const {loaded, skipped} = c.load({
            type: 'FeatureCollection',
            features: [
                metocFeature(N.Trough, line()),
                {type: 'Feature', geometry: {type: 'LineString', coordinates: line()}, properties: {metoc: {name: 'NotAThing'}}},
                {type: 'Feature', geometry: {type: 'Point', coordinates: [0, 0]}, properties: {metoc: {name: N.Trough}}},
                {type: 'Feature', geometry: {type: 'LineString', coordinates: [[0, 0]]}, properties: {metoc: {name: N.Trough}}},
                {type: 'Feature', geometry: {type: 'LineString', coordinates: [[0, 0], ['x', 1]]}, properties: {metoc: {name: N.Trough}}},
                null,
            ],
        });
        expect(loaded).toHaveLength(1);
        expect(skipped.map((s) => s.index)).toEqual([1, 2, 3, 4, 5]);
    });

    it('removes a property set to undefined rather than storing an empty one', () => {
        const c = new MetocCollection();
        const id = c.add(metocFeature(N.IsobarSurface, line(), {value: '1012'}));
        c.setProperties(id, {value: undefined});
        expect(c.get(id)!.properties.metoc).toEqual({name: N.IsobarSurface});
        c.setProperties(id, {value: ''});
        expect('value' in c.get(id)!.properties.metoc).toBe(false);
    });

    it('announces each change once, after it is made', () => {
        const c = new MetocCollection();
        const seen: string[] = [];
        c.subscribe((ch) => seen.push(`${ch.type}:${c.size}`));
        const id = c.add(metocFeature(N.Trough, line()));
        c.setPoints(id, line().slice(0, 2));
        c.remove(id);
        c.clear();
        expect(seen).toEqual(['add:1', 'update:1', 'remove:0', 'reset:0']);
    });

    it('never reuses an id', () => {
        const c = new MetocCollection();
        const f = {...metocFeature(N.Trough, line()), id: 'x'};
        expect(c.add(f)).toBe('x');
        expect(c.add(f)).not.toBe('x');
    });
});
