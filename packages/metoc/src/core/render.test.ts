import {MetocGraphicName as N, listMetocGraphics} from './catalog';
import {paintMetocGraphicAsGeoJSON, renderMetocGraphic, toFeatureCollection} from './render';
import {metocFeature} from './types';
import {metocThumbnailSvg} from '../symbology/thumbnail';
import {configureMetoc, getDefaultLineColor} from './config';
import {paintMetocGraphic} from './render';

const f = metocFeature(
    N.Isotherm,
    [
        [-100, 40],
        [-95, 42],
        [-90, 40],
    ],
    {value: '-10'},
    'a',
);

describe('renderMetocGraphic', () => {
    it('returns the painted line, label anchors and handles, each with its role and properties.metoc', () => {
        const r = renderMetocGraphic(f);
        expect(r.graphic.properties).toMatchObject({role: 'graphic', metoc: {name: N.Isotherm, value: '-10'}});
        expect(r.graphic.geometry.coordinates.length).toBeGreaterThan(3);
        expect(r.labels).toHaveLength(3);
        expect(r.labels.every((l) => l.properties!.role === 'label' && l.properties!.text === '-10')).toBe(true);
        expect(r.handles.map((h) => h.geometry.coordinates)).toEqual(f.geometry.coordinates);
        expect(toFeatureCollection(r).features).toHaveLength(1 + 3 + 3);
    });

    it('ends the painted line where the operator clicked', () => {
        const coords = renderMetocGraphic(f).graphic.geometry.coordinates as number[][];
        expect(coords[0][0]).toBeCloseTo(-100, 9);
        expect(coords[0][1]).toBeCloseTo(40, 9);
        expect(coords[coords.length - 1][0]).toBeCloseTo(-90, 9);
    });
});

describe('paintMetocGraphicAsGeoJSON', () => {
    it('styles marks with simplestyle properties in EPSG:4326', () => {
        const fc = paintMetocGraphicAsGeoJSON(f, {resolution: 2000});
        const line = fc.features.find((x) => x.properties!.role === 'line')!;
        expect(line.properties).toMatchObject({stroke: 'rgb(255, 0, 0)', 'stroke-width': 2});
        expect(line.properties!['stroke-dasharray']).toEqual([10, 6]);
        const label = fc.features.find((x) => x.properties!.role === 'label')!;
        expect(label.properties).toMatchObject({text: '-10'});
        const [lon, lat] = (line.geometry as {coordinates: number[][]}).coordinates[0];
        expect(lon).toBeGreaterThan(-101);
        expect(lat).toBeGreaterThan(39);
    });
});

describe('thumbnails', () => {
    it.each(listMetocGraphics())('%s draws an SVG', (name) => {
        const svg = metocThumbnailSvg(name);
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).toMatch(/<polyline |<polygon |<text /);
    });

    it('escapes label text', () => {
        expect(metocThumbnailSvg(N.IsobarSurface, {value: '<b>'})).toContain('&lt;b&gt;');
    });
});

describe('the default line colour', () => {
    afterEach(() => configureMetoc({defaultLineColor: undefined}));
    const strokes = (f: ReturnType<typeof metocFeature>) => [...new Set(paintMetocGraphic(f, {resolution: 1000}).flatMap((p) => [p.stroke?.color, p.text?.color].filter(Boolean)))];

    it('recolours only what the standard draws black', () => {
        const isobar = metocFeature(N.IsobarSurface, [[-100, 40], [-95, 41], [-90, 40]], {value: '1004'});
        const front = metocFeature(N.ColdFront, [[-100, 40], [-95, 41], [-90, 40]]);
        expect(strokes(isobar)).toEqual(['rgb(0, 0, 0)']);
        configureMetoc({defaultLineColor: 'rgb(119, 119, 119)'});
        expect(getDefaultLineColor()).toBe('rgb(119, 119, 119)');
        // The isobar and its value follow it; the cold front keeps the standard's blue.
        expect(strokes(isobar)).toEqual(['rgb(119, 119, 119)']);
        expect(strokes(front)).toEqual(['rgb(0, 0, 255)']);
        // A black outline on a coloured area follows it too.
        const drydock = metocFeature(N.Drydock, [[-100, 40], [-99, 40], [-99, 41], [-100, 41]]);
        expect(strokes(drydock)).toContain('rgb(119, 119, 119)');
        configureMetoc({defaultLineColor: undefined});
        expect(getDefaultLineColor()).toBe('rgb(0, 0, 0)');
    });
});
