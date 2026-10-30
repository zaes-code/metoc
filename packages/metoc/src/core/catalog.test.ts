import {METOC_GRAPHICS, MetocGraphicName, getMetocDisplayName, isMetocGraphicName, listMetocGraphics, metocGraphicByEntityCode} from './catalog';
import {metocGraphicFromSidc, metocSidc} from './sidc';
import {painterFor} from '../symbology/paints';

/**
 * Every entity in MIL-STD-2525E Change 1, Tables A-LI (set 45) and A-LII (set 46), by geometric
 * rendering, that Tables M-II / M-III give a drawing (a draw rule), in table order. Extracted from
 * the standard's PDF. A graphic added to or dropped from the catalog is reconciled
 * against these lists, never the other way round.
 */
const STANDARD: Record<string, string[]> = {
    '45 point': ["110100", "110101", "110102", "110200", "110201", "110202", "110501", "110502", "110503", "110504", "110505", "110506", "110507", "110508", "110509", "120100", "120200", "120300", "120400", "120500", "130101", "130102", "130103", "130201", "130202", "130203", "130301", "130302", "130303", "140100", "150101", "150102", "150103", "150104", "150105", "150106", "160101", "160102", "160103", "160104", "160105", "160106", "160201", "160202", "160301", "160302", "160303", "160401", "160402", "160403", "160404", "160405", "160406", "160501", "160502", "160601", "160602", "160603", "160604", "160701", "160702", "160703", "160704", "160705", "160706", "160707", "160708", "160800", "160901", "160902", "161001", "161002", "161100", "161201", "161202", "161203", "161300", "161401", "161402", "161403", "161404", "161405", "161406", "161407", "161408", "161501", "161502", "161503", "161504", "161505", "161506", "161507", "161600", "161700", "161800", "161901", "161902", "161903", "161904", "162001", "162002", "162003", "162100", "162101", "162200", "162300", "162400", "190101", "190102", "190103", "190104", "190105", "190106", "190107", "190108", "190109", "190110", "190201", "190202", "190203", "190204", "190205", "190206", "190207", "190208", "190209", "190210"],
    '45 line': ["110301", "110302", "110303", "110304", "110305", "110306", "110307", "110308", "110309", "110310", "110311", "110312", "110313", "110314", "110315", "110401", "110402", "110403", "110404", "110405", "110406", "110407", "110408", "110409", "140300", "140400", "180100", "180200", "180300", "180400", "180500", "180600", "180700"],
    '45 area': ["162004", "170100", "170200", "170300", "170400", "170500", "170501", "170600", "170700", "170800", "170900", "171000"],
    // Sea Ice (110400) is a hierarchy row in Table A-LII but Table M-III draws it (Point3, a dot).
    '46 point': ["110101", "110102", "110103", "110104", "110105", "110106", "110107", "110108", "110109", "110110", "110201", "110202", "110203", "110301", "110302", "110303", "110304", "110400", "110401", "110402", "110403", "110700", "110701", "110801", "110802", "110803", "120101", "120302", "120303", "120304", "120307", "120309", "120310", "120311", "120315", "120316", "120321", "120322", "120323", "120324", "120401", "120402", "120403", "120404", "120406", "120408", "120409", "120501", "120502", "120504", "120506", "120508", "120509", "120510", "120513", "120601", "120602", "120603", "120604", "120605", "120606", "120607", "120608", "120609", "120610", "120611", "120612", "120613", "120614", "120701", "120704", "120705", "160400", "160500", "160600", "160900"],
    '46 line': ["110501", "110502", "110503", "110504", "110505", "110506", "110601", "110602", "110603", "110604", "120102", "120103", "120201", "120205", "120305", "120308", "120317", "120319", "120320", "120326", "120327", "120328", "120407", "120511", "120512", "120702", "120703", "150100", "150300", "160100", "160300", "160800"],
    '46 area': ["120104", "120202", "120203", "120204", "120206", "120306", "120312", "120314", "120318", "120405", "120503", "120505", "120507", "120514", "130101", "130102", "130103", "130104", "130105", "130106", "130107", "130108", "130109", "130201", "130202", "130203", "130204", "140101", "140102", "140103", "140104", "140105", "140106", "140107", "140108", "140109", "140110", "140111", "140112", "140113", "140114", "140115", "140116", "140117", "140118", "140119", "140120", "140121", "140122", "140123", "140124", "140125", "140126", "140127", "140128", "140129", "140130", "140131", "140132", "140133", "140134", "140135", "140136", "140137", "140138", "140139", "140140", "150200", "150400", "150500", "150600", "160200", "160700"],
};

/** The table's own rendering for a draw rule: Line5 (the ITCZ) is a Line there though it is traced as an area. */
const tableKind = (rule: string) => (rule.startsWith('Point') ? 'point' : rule.startsWith('Line') ? 'line' : 'area');

describe('the catalog', () => {
    it.each(Object.keys(STANDARD))('covers every %s the standard draws, and nothing else', (key) => {
        const [set, kind] = key.split(' ');
        const codes = listMetocGraphics()
            .map((n) => METOC_GRAPHICS[n])
            .filter((s) => String(s.symbolSet) === set && tableKind(s.drawRule) === kind && s.entityCode !== null)
            .map((s) => s.entityCode as string);
        expect([...codes].sort()).toEqual([...STANDARD[key]].sort());
    });

    it('has one graphic per symbol set and code, and only the wind barb and the station plot without one', () => {
        const coded = listMetocGraphics().filter((n) => METOC_GRAPHICS[n].entityCode !== null);
        const keys = coded.map((n) => `${METOC_GRAPHICS[n].symbolSet}:${METOC_GRAPHICS[n].entityCode}`);
        expect(new Set(keys).size).toBe(keys.length);
        // Table M-I's barb rule has no Table A-LI entity; the station plot is a composite of Appendix M symbols.
        expect(listMetocGraphics().filter((n) => METOC_GRAPHICS[n].entityCode === null)).toEqual([MetocGraphicName.WindBarb, MetocGraphicName.StationPlot]);
    });

    it('draws each graphic as its rule says: Area and Line5 as areas, Point as points, other Lines as lines', () => {
        for (const n of listMetocGraphics()) {
            const {drawRule, geometry} = METOC_GRAPHICS[n];
            const want = drawRule.startsWith('Area') || drawRule === 'Line5' ? 'area' : drawRule.startsWith('Point') ? 'point' : 'line';
            expect(geometry).toBe(want);
        }
    });

    it('keys each entry by its own name', () => {
        for (const n of listMetocGraphics()) expect(METOC_GRAPHICS[n].name).toBe(n);
    });

    it('agrees with the enum both ways', () => {
        expect(listMetocGraphics().sort()).toEqual(Object.values(MetocGraphicName).sort());
    });

    it('has a painter for every graphic', () => {
        const without = listMetocGraphics().filter((n) => !painterFor(METOC_GRAPHICS[n]));
        expect(without).toEqual([]);
    });

    it('gives every graphic a display name that is not its enum key', () => {
        for (const n of listMetocGraphics()) {
            expect(getMetocDisplayName(n).length).toBeGreaterThan(0);
            // A multi-word key such as ColdFront must never reach a UI as written.
            if (/[a-z][A-Z]/.test(n)) expect(getMetocDisplayName(n)).not.toBe(n);
        }
    });

    it('finds a graphic by entity code, and rejects unknown names', () => {
        expect(metocGraphicByEntityCode('110301')).toBe(MetocGraphicName.ColdFront);
        // Sets 45 and 46 reuse codes: the set decides.
        expect(metocGraphicByEntityCode('110101')).toBe(MetocGraphicName.CycloneCenter);
        expect(metocGraphicByEntityCode('110101', 46)).toBe(MetocGraphicName.ManyIcebergs);
        expect(metocGraphicByEntityCode('999999')).toBeUndefined();
        expect(isMetocGraphicName('ColdFront')).toBe(true);
        expect(isMetocGraphicName('toString')).toBe(false);
        expect(isMetocGraphicName(42)).toBe(false);
    });

    it('marks operator colours only where Table M-II leaves the colour open', () => {
        const open = listMetocGraphics().filter((n) => METOC_GRAPHICS[n].operatorColor);
        expect(open.sort()).toEqual(
            [
                MetocGraphicName.JetStream,
                MetocGraphicName.OperatorDefinedFreeformLine,
                MetocGraphicName.StreamLine,
                MetocGraphicName.TropicalStormWindArea,
                MetocGraphicName.TropicalDepression,
                MetocGraphicName.TropicalStorm,
                MetocGraphicName.HurricaneTyphoon,
                MetocGraphicName.VolcanicAsh,
                MetocGraphicName.OperatorDefinedMaritimeArea,
                MetocGraphicName.OperatorDefinedFreeformArea,
            ].sort(),
        );
    });
});

describe('SIDCs', () => {
    it('builds a 30-digit 2525E(1) code with symbol set 45 and the entity code', () => {
        const sidc = metocSidc(MetocGraphicName.WarmFront)!;
        expect(sidc).toHaveLength(30);
        expect(sidc.slice(0, 2)).toBe('15');
        expect(sidc.slice(2, 4)).toBe('00');
        expect(sidc.slice(4, 6)).toBe('45');
        expect(sidc.slice(10, 16)).toBe('110305');
    });

    it('round-trips every graphic', () => {
        for (const n of listMetocGraphics()) {
            const sidc = metocSidc(n);
            if (METOC_GRAPHICS[n].entityCode === null) expect(sidc).toBeUndefined();
            else expect(metocGraphicFromSidc(sidc!)).toBe(n);
        }
    });

    it('reads a 20-digit 2525D code and ignores the identity digits', () => {
        expect(metocGraphicFromSidc('10034500001103010000')).toBe(MetocGraphicName.ColdFront);
    });

    it('rejects other symbol sets and malformed codes', () => {
        expect(metocGraphicFromSidc('10032500001103010000')).toBeUndefined();
        expect(metocGraphicFromSidc('1003450000110301')).toBeUndefined();
        expect(metocGraphicFromSidc('abc')).toBeUndefined();
    });
});
