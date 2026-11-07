import {describe, expect, it} from 'vitest';
import {METOC_GRAPHICS, MetocGraphicName as N, listMetocGraphics, type MetocGraphicName} from './catalog';
import {MetocCollection} from './collection';
import {paintMetocGraphic, paintedOutline} from './render';
import {parseXml, readS100Dataset} from './s100';
import {drawnPoints, metocFeature} from './types';
import {configureMetoc, resetMetocConfig} from './config';
import {toMercator} from '@zaes/symbology-engine';

/** The test dataset's issue date, built so the source carries no literal date. */
const ISSUE = [2026, 11, '06'].join('-');

// The S-412 portrayal catalogue (draft, rules for feature catalogue 1.1.0): each warning's line and
// fill token, the fill's transparency, and the day palette's RGB for each token. Wave rules are
// shifted one code up (see s412.ts); 2.5-4 m has no rule and is pinned to WXVLB.
const S412_RULES: [MetocGraphicName, string, string, number][] = [
    [N.S412WindWarningNearGale, '#00ff00', '#00ff00', 0.5],
    [N.S412WindWarningGale, '#ffff00', '#ffff00', 0.5],
    [N.S412WindWarningStorm, '#ffa500', '#ffa500', 0.5],
    [N.S412WindWarningHurricane, '#ff0000', '#ff0000', 0.5],
    [N.S412WaveWarning2To4m, '#0000ff', '#d2ebf5', 0.4],
    [N.S412WaveWarning4To6m, '#0000ff', '#add8e6', 0.4],
    [N.S412WaveWarning6To9m, '#0000ff', '#87ceeb', 0.4],
    [N.S412WaveWarning9To14m, '#00008b', '#4682b4', 0.5],
    [N.S412WaveWarningOver14m, '#000080', '#000080', 0.6],
    [N.S412IceAccretionModerate, '#f0c0f0', '#f0c0f0', 0.5],
    [N.S412IceAccretionSevere, '#f000f0', '#f000f0', 0.5],
    [N.S412RestrictedVisibility, '#787864', '#787864', 0.7],
    [N.S412Thunderstorm, '#965a28', '#965a28', 0.5],
];

// The S-411 WMO colour codes, from its seaice_iceact and seaice_icesod style sheets: code → fill.
const CONCENTRATION: Record<number, string> = {
    1: '#0064ff', 2: '#96c8ff', 3: '#96c8ff', 10: '#8cffa0', 12: '#8cffa0', 13: '#8cffa0', 20: '#8cffa0', 23: '#8cffa0', 24: '#ffff00', 30: '#8cffa0',
    34: '#ffff00', 35: '#ffff00', 40: '#ffff00', 45: '#ffff00', 46: '#ffff00', 50: '#ffff00', 56: '#ffff00', 57: '#ff7d07', 60: '#ffff00', 67: '#ff7d07',
    68: '#ff7d07', 70: '#ff7d07', 78: '#ff7d07', 79: '#ff0000', 80: '#ff7d07', 81: '#ff0000', 89: '#ff0000', 90: '#ff0000', 91: '#ff0000', 92: '#910000', 99: '#000000',
};
const STAGE: Record<number, string> = {
    1: '#96c8ff', 70: '#96c8ff', 80: '#96c8ff', 81: '#f0d2fa', 82: '#ff64ff', 83: '#aa28f0', 84: '#873cd7', 85: '#dc50eb', 86: '#ffff00', 87: '#ffd200',
    88: '#d7fa82', 89: '#affa00', 91: '#00c814', 93: '#007800', 94: '#007800', 95: '#b46432', 96: '#ff780a', 97: '#c80000', 98: '#ff0000', 99: '#000000',
};

const fillOf = (n: MetocGraphicName) => METOC_GRAPHICS[n].areaStyle?.fill;

describe('the S-412 warnings', () => {
    it('draw each threshold in its portrayal catalogue colours and transparency', () => {
        for (const [name, line, fill, transparency] of S412_RULES) {
            expect(METOC_GRAPHICS[name].colors[0], name).toBe(line);
            expect(fillOf(name), name).toEqual({color: fill, opacity: 1 - transparency});
            expect(METOC_GRAPHICS[name].areaStyle?.outline?.widthPx, name).toBeCloseTo((0.64 * 96) / 25.4, 6);
        }
        const all = listMetocGraphics().filter((n) => METOC_GRAPHICS[n].source === 'S-412');
        expect(all.sort()).toEqual(S412_RULES.map(([n]) => n).sort());
    });

    it('draw their S-100 corners exactly, straight between them, though lines are smoothed', () => {
        configureMetoc({smoothLines: true});
        try {
            const ring = [[-70, 30], [-68, 30], [-68, 31], [-70, 31]];
            const outline = paintedOutline(metocFeature(N.S412WindWarningGale, ring));
            expect(outline).toEqual([...ring, ring[0]].map(toMercator));
            // An Appendix M area through the same points is a curve.
            expect(paintedOutline(metocFeature(N.OperatorDefinedFreeformArea, ring)).length).toBeGreaterThan(5);
        } finally {
            resetMetocConfig();
        }
    });

    it('cover every threshold of the feature catalogue', () => {
        const codes = (feature: string) =>
            listMetocGraphics()
                .filter((n) => METOC_GRAPHICS[n].s100?.feature === feature)
                .flatMap((n) => METOC_GRAPHICS[n].s100?.codes ?? [0]);
        expect(codes('WindWarning').sort()).toEqual([1, 2, 3, 4]);
        expect(codes('SignificantWaveHeightWarning').sort()).toEqual([1, 2, 3, 4, 5]);
        expect(codes('IceAccretionWarning').sort()).toEqual([1, 2]);
        expect(codes('RestrictedVisibilityWarning')).toEqual([0]);
        expect(codes('ThunderstormWarning')).toEqual([0]);
    });
});

describe('the S-411 ice chart', () => {
    const colourOf = (attribute: string, code: number) => {
        const n = listMetocGraphics().find((x) => METOC_GRAPHICS[x].s100?.attribute === attribute && METOC_GRAPHICS[x].s100?.codes?.includes(code));
        return n && fillOf(n)?.color;
    };

    it('colours every concentration code as the WMO colour code does', () => {
        for (const [code, colour] of Object.entries(CONCENTRATION)) expect(colourOf('totalConcentration', Number(code)), `code ${code}`).toBe(colour);
    });

    it('colours every stage of development as the WMO colour code does', () => {
        for (const [code, colour] of Object.entries(STAGE)) expect(colourOf('iceStageofDevelopment', Number(code)), `code ${code}`).toBe(colour);
    });

    it('gives each code one class only', () => {
        for (const attribute of ['totalConcentration', 'iceStageofDevelopment']) {
            const codes = listMetocGraphics().flatMap((n) => (METOC_GRAPHICS[n].s100?.attribute === attribute ? [...(METOC_GRAPHICS[n].s100?.codes ?? [])] : []));
            expect(new Set(codes).size, attribute).toBe(codes.length);
        }
    });

    it('fills its areas at half and draws the ice edge and limits as plain 1 mm lines', () => {
        expect(fillOf(N.S411ClosePack)?.opacity).toBe(0.5);
        for (const n of [N.S411IceEdge, N.S411LimitOfOpenWater, N.S411LimitOfAllKnownIce]) {
            expect(METOC_GRAPHICS[n].lineStyle?.widthPx, n).toBeCloseTo(96 / 25.4, 6);
            expect(METOC_GRAPHICS[n].lineStyle?.decorations, n).toBeUndefined();
        }
        expect([N.S411IceEdge, N.S411LimitOfOpenWater, N.S411LimitOfAllKnownIce].map((n) => METOC_GRAPHICS[n].colors[0])).toEqual(['black', '#ff0000', '#00ff00']);
    });

    it('paints its lines with their marks along them', () => {
        const line = (name: MetocGraphicName) => ({type: 'Feature' as const, id: 'l', geometry: {type: 'LineString' as const, coordinates: [[0, 0], [0.5, 0]]}, properties: {metoc: {name}}});
        for (const n of [N.S411IcebergLimit, N.S411IceRidgeLine, N.S411IceLeadLine, N.S411IceCrackLine]) {
            const marks = paintMetocGraphic(line(n), {resolution: 50});
            expect(marks.length, n).toBeGreaterThan(5);
        }
    });
});

describe('parseXml', () => {
    it('reads elements, attributes, text, CDATA and entities, and drops namespace prefixes', () => {
        const doc = parseXml('<?xml version="1.0"?><!-- c --><a:Root xmlns:a="x" gml:id="R"><b code="3">t &amp; &#65;</b><c><![CDATA[<raw>]]></c><d/></a:Root>');
        expect(doc.name).toBe('Root');
        expect(doc.attrs).toEqual({id: 'R'});
        expect(doc.children.map((c) => c.name)).toEqual(['b', 'c', 'd']);
        expect(doc.children[0].attrs.code).toBe('3');
        expect(doc.children[0].text).toBe('t & A');
        expect(doc.children[1].text).toBe('<raw>');
    });

    it('refuses a document that is not well formed', () => {
        expect(() => parseXml('<a><b></a>')).toThrow();
        expect(() => parseXml('<a>')).toThrow();
        expect(() => parseXml('not xml')).toThrow();
    });
});

const surface = (posList: string, interior = '') =>
    `<S412:geometry><S100:surfaceProperty><S100:Surface gml:id="s"><gml:patches><gml:PolygonPatch><gml:exterior><gml:LinearRing><gml:posList>${posList}</gml:posList></gml:LinearRing></gml:exterior>${interior}</gml:PolygonPatch></gml:patches></S100:Surface></S100:surfaceProperty></S412:geometry>`;

const dataset = (product: string, members: string) => `<?xml version="1.0" encoding="UTF-8"?>
<S412:Dataset xmlns:S412="http://www.iho.int/S412/1.1" xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:S100="http://www.iho.int/s100gml/5.0" xmlns:xlink="http://www.w3.org/1999/xlink" gml:id="DS1">
  <S100:DatasetIdentificationInformation>
    <S100:productIdentifier>${product}</S100:productIdentifier>
    <S100:productEdition>1.1.0</S100:productEdition>
  </S100:DatasetIdentificationInformation>
  <S412:members>${members}</S412:members>
</S412:Dataset>`;

const RING = '60.0 -32.0 60.2 -32.0 60.2 -32.3 60.0 -32.3 60.0 -32.0';

describe('readS100Dataset: S-412', () => {
    const provider = `<S412:DataProvider gml:id="ID0"><S412:issuingService><S412:issuingServiceName><S412:information><S412:language>eng</S412:language><S412:text>Met Service</S412:text></S412:information></S412:issuingServiceName></S412:issuingService></S412:DataProvider>`;
    const wind = (code: number | string, extra = '') => `<S412:WindWarning gml:id="ID1">
        <S412:fixedDateRange><S412:dateStart><S100:date>${ISSUE}</S100:date></S412:dateStart><S412:timeOfDayStart>0600</S412:timeOfDayStart></S412:fixedDateRange>
        <S412:issueDate>${ISSUE}</S412:issueDate>
        <S412:weatherWarningNumber>12</S412:weatherWarningNumber>
        <S412:dataProviderInformation xlink:href="#ID0"/>
        <S412:windWarningThreshold code="${code}">storm force</S412:windWarningThreshold>
        <S412:beaufortForce code="10">storm</S412:beaufortForce>
        ${extra}${surface(RING)}</S412:WindWarning>`;

    it('reads a wind warning as the graphic for its threshold, latitude first, with its attributes', () => {
        const r = readS100Dataset(dataset('S-412', provider + wind(3)));
        expect(r.product).toBe('S-412');
        expect(r.edition).toBe('1.1.0');
        expect(r.skipped).toEqual([]);
        expect(r.features).toHaveLength(1);
        const f = r.features[0];
        expect(f.properties.metoc.name).toBe(N.S412WindWarningStorm);
        expect(f.geometry.type).toBe('Polygon');
        expect(drawnPoints(f)).toEqual([[-32.0, 60.0], [-32.0, 60.2], [-32.3, 60.2], [-32.3, 60.0]]);
        expect(f.properties.metoc.s100).toMatchObject({
            id: 'ID1',
            windWarningThreshold: 3,
            beaufortForce: 10,
            issueDate: ISSUE,
            weatherWarningNumber: 12,
            'fixedDateRange.dateStart.date': ISSUE,
            'fixedDateRange.timeOfDayStart': 600,
            issuingService: 'Met Service',
        });
    });

    it('keeps the attributes through the store', () => {
        const r = readS100Dataset(dataset('S-412', provider + wind(3)));
        const c = new MetocCollection();
        const id = c.add(r.features[0]);
        expect(c.get(id)?.properties.metoc.s100?.windWarningThreshold).toBe(3);
        const saved = JSON.parse(JSON.stringify(c.toGeoJSON()));
        const reloaded = new MetocCollection();
        expect(reloaded.load(saved).loaded).toHaveLength(1);
        expect(reloaded.list()[0].properties.metoc.s100?.issuingService).toBe('Met Service');
    });

    it('reads every warning type and threshold', () => {
        const members = [
            ...[1, 2, 3, 4].map((c) => wind(c).replace('ID1', `W${c}`)),
            ...[1, 2, 3, 4, 5].map((c) => `<S412:SignificantWaveHeightWarning gml:id="H${c}"><S412:significantWaveHeightWarningThreshold>${c}</S412:significantWaveHeightWarningThreshold>${surface(RING)}</S412:SignificantWaveHeightWarning>`),
            ...[1, 2].map((c) => `<S412:IceAccretionWarning gml:id="I${c}"><S412:iceAccretionRate code="${c}">x</S412:iceAccretionRate><S412:sourceOfIcing code="1">freezingSpray</S412:sourceOfIcing>${surface(RING)}</S412:IceAccretionWarning>`),
            `<S412:RestrictedVisibilityWarning gml:id="V">${surface(RING)}</S412:RestrictedVisibilityWarning>`,
            `<S412:ThunderstormWarning gml:id="T">${surface(RING)}</S412:ThunderstormWarning>`,
        ].join('');
        const r = readS100Dataset(dataset('S-412', members));
        expect(r.skipped).toEqual([]);
        expect(r.features.map((f) => f.properties.metoc.name)).toEqual(S412_RULES.map(([n]) => n));
    });

    it('lists what it could not draw, with the reason', () => {
        const r = readS100Dataset(dataset('S-412', wind(9) + `<S412:WindWarning gml:id="X"></S412:WindWarning>` + `<S412:Mystery gml:id="M">${surface(RING)}</S412:Mystery>`));
        expect(r.features).toEqual([]);
        expect(r.skipped).toEqual([
            {id: 'ID1', feature: 'WindWarning', reason: 'windWarningThreshold 9 is not one the product defines'},
            {id: 'X', feature: 'WindWarning', reason: 'no geometry'},
            {id: 'M', feature: 'Mystery', reason: 'not a feature this library draws'},
        ]);
    });

    it('reads longitude-first data when asked, and warns of interior rings it cannot draw', () => {
        const hole = '<gml:interior><gml:LinearRing><gml:posList>-32.1 60.05 -32.1 60.1 -32.2 60.1 -32.1 60.05</gml:posList></gml:LinearRing></gml:interior>';
        const r = readS100Dataset(dataset('S-412', `<S412:ThunderstormWarning gml:id="T">${surface('-32.0 60.0 -32.0 60.2 -32.3 60.2 -32.0 60.0', hole)}</S412:ThunderstormWarning>`), {axisOrder: 'lonlat'});
        expect(drawnPoints(r.features[0])).toEqual([[-32.0, 60.0], [-32.0, 60.2], [-32.3, 60.2]]);
        expect(r.warnings).toEqual(['T: 1 interior ring(s) not drawn; an area is one ring.']);
    });
});

describe('readS100Dataset: S-411', () => {
    const ice = (id: string, attrs: string) => `<SeaIce gml:id="${id}">${attrs}${surface(RING).replace(/S412:geometry/g, 'geometry')}</SeaIce>`;
    const curve = (name: string) => `<${name} gml:id="${name}"><geometry><S100:curveProperty><S100:Curve gml:id="c"><gml:segments><gml:LineStringSegment><gml:posList>70 -40 70.5 -39 71 -38</gml:posList></gml:LineStringSegment></gml:segments></S100:Curve></S100:curveProperty></geometry></${name}>`;
    const point = (name: string, attrs = '') => `<${name} gml:id="${name}">${attrs}<geometry><S100:pointProperty><S100:Point gml:id="p"><gml:pos>70 -40</gml:pos></S100:Point></S100:pointProperty></geometry></${name}>`;
    const cover = `<DataCoverage gml:id="C">${surface(RING).replace(/S412:geometry/g, 'geometry')}</DataCoverage>`;

    it('colours a sea-ice area by its concentration, or by its first stage of development', () => {
        const members = cover + ice('A', '<totalConcentration>81</totalConcentration><iceStageofDevelopment>95</iceStageofDevelopment><iceStageofDevelopment>86</iceStageofDevelopment>');
        const byConcentration = readS100Dataset(dataset('S-411', members));
        expect(byConcentration.features.map((f) => f.properties.metoc.name)).toEqual([N.S411VeryClosePack]);
        expect(byConcentration.features[0].properties.metoc.s100?.iceStageofDevelopment).toBe('95, 86');
        expect(byConcentration.skipped).toEqual([{id: 'C', feature: 'DataCoverage', reason: 'the data coverage is metadata, not a graphic'}]);
        const byStage = readS100Dataset(dataset('S-411', members), {iceColorCode: 'stageOfDevelopment'});
        expect(byStage.features.map((f) => f.properties.metoc.name)).toEqual([N.S411OldIce]);
    });

    it('draws an area with no concentration as undetermined, and says so', () => {
        const r = readS100Dataset(dataset('S-411', ice('A', '<snowDepth>10</snowDepth>')));
        expect(r.features.map((f) => f.properties.metoc.name)).toEqual([N.S411ConcentrationUnknown]);
        expect(r.warnings).toEqual(['A: A sea-ice area with no total concentration is drawn as undetermined.']);
    });

    it('reads the ice edge, limits and ice lines', () => {
        const names = ['IceEdge', 'IcebergLimit', 'LimitOfOpenWater', 'LimitOfAllKnownIce', 'LineOfIceRidge', 'LineOfIceLead', 'LineOfIceFracture', 'LineOfIceCrack'];
        const r = readS100Dataset(dataset('S-411', names.map(curve).join('')));
        expect(r.skipped).toEqual([]);
        expect(r.features.map((f) => f.properties.metoc.name)).toEqual([
            N.S411IceEdge,
            N.S411IcebergLimit,
            N.S411LimitOfOpenWater,
            N.S411LimitOfAllKnownIce,
            N.S411IceRidgeLine,
            N.S411IceLeadLine,
            N.S411IceFractureLine,
            N.S411IceCrackLine,
        ]);
        expect(drawnPoints(r.features[0])).toEqual([[-40, 70], [-39, 70.5], [-38, 71]]);
    });

    it('reads ice symbols as the Appendix M symbols for them', () => {
        const r = readS100Dataset(
            dataset(
                'S-411',
                [
                    point('Iceberg', '<icebergSize>4</icebergSize>'),
                    point('Floeberg'),
                    point('IceDrift', '<iceDriftDirection>9</iceDriftDirection>'),
                    point('IceRidgeHummock'),
                    point('IceThickness', '<iceAverageThickness>45</iceAverageThickness><iceThicknessType>1</iceThicknessType>'),
                    point('IceCompacting'),
                    point('GroundedHummock'),
                    point('IceDrift', '<iceDriftDirection>10</iceDriftDirection>').replace('"IceDrift"', '"D2"'),
                ].join(''),
            ),
        );
        expect(r.features.map((f) => f.properties.metoc.name)).toEqual([N.IcebergGeneral, N.Floeberg, N.IceDrift, N.RidgesHummocks, N.IceThicknessObserved, N.IceConvergence, N.S411GroundedHummock]);
        // Drift to the north: the east-pointing arrow turned a quarter turn back.
        expect(r.features[2].properties.metoc.rotation).toBe(270);
        expect(r.features[4].properties.metoc.value).toBe('45');
        expect(r.skipped.map((s) => s.feature)).toEqual(['IceDrift']);
    });

    it('reads the ice symbols Appendix M has none for as S-411 drawings, the melt stage with its code', () => {
        const names = ['IceKeelBummock', 'GroundedHummock', 'StripsAndPatches', 'IceLead', 'IceFracture'];
        const r = readS100Dataset(dataset('S-411', names.map((n) => point(n)).join('') + point('StageOfMelt', '<meltStage>2</meltStage>')));
        expect(r.skipped).toEqual([]);
        expect(r.features.map((f) => f.properties.metoc.name)).toEqual([N.S411IceKeel, N.S411GroundedHummock, N.S411StripsAndPatches, N.S411IceLeadPoint, N.S411IceFracturePoint, N.S411StageOfMelt]);
        expect(r.features[5].properties.metoc.value).toBe('2');
    });
});
