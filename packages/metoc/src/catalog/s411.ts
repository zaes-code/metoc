/**
 * S-411 Ice Information (WMO, on IHO S-100): the areas, lines and boundaries of an ice chart.
 *
 * An ice chart colours each sea-ice area by one of the WMO ice chart colour codes: by its total
 * concentration, or by its stage of development. Both codes are the S-411 portrayal's own (its
 * concentration and stage-of-development style sheets), keyed by the S-411 feature catalogue's
 * codes, which are SIGRID-3's: an entry here is one colour class, and lists the codes it stands
 * for. Areas fill at 50 % with a 0.32 mm outline in their colour, as S-411 1.2.1 draws a sea-ice
 * area. The lines are the S-411 line styles, one 10 mm period of each repeated along the line.
 *
 * The ice chart's point symbols are WMO's ice symbols, which Appendix M's ice graphics already
 * draw (icebergs, ridges, rafting, drift and the rest): S-411 point data is read into those. The
 * six Appendix M has no symbol for (keel, grounded hummock, strips and patches, stage of melt, a
 * lead or fracture at a point) are S-411's own drawings, 5 by 2.5 mm.
 */

import {MetocCategory, metocSpec, type AreaStyleDef, type GlyphDef, type LineStyleDef} from '../core/specTypes.js';
import {S100_PX_PER_MM} from './s412.js';

const IC = MetocCategory.IceCharts;

/** A glyph drawn in millimetres: one unit is a millimetre on screen, `width` wide, anchored on the line at `y`. */
const mm = (parts: GlyphDef['parts'], width = 10, y = 1.25): GlyphDef => ({parts, box: width, anchor: [width / 2, y], scale: S100_PX_PER_MM / 1.25});

const PERIOD_PX = 10 * S100_PX_PER_MM;
const THIN = 0.32 * S100_PX_PER_MM;
const PEN = 0.4 * S100_PX_PER_MM;
/** Chart black (S-100's CHBLK): the palette's black, which a host retunes for a dark map, as Appendix M's. */
const BLACK = 'black';

/** A sea-ice colour class: half-transparent fill, a thin outline in the same colour. */
function iceArea(color: `#${string}`): {areaStyle: AreaStyleDef} {
    return {areaStyle: {fill: {color, opacity: 0.5}, outline: {color: 'main', widthPx: THIN}}};
}

/** A line style with one 10 mm mark repeated along it, as the S-411 line styles are drawn. */
function marked(glyph: GlyphDef): {lineStyle: LineStyleDef} {
    return {lineStyle: {color: 'main', widthPx: PEN, decorations: [{kind: 'glyph', glyph, spacingPx: PERIOD_PX}]}};
}

/** A plain line, 1 mm wide, as the S-411 ice edge and limits are drawn. */
const plain = (): {lineStyle: LineStyleDef} => ({lineStyle: {color: 'main', widthPx: 1 * S100_PX_PER_MM}});

const conc = (codes: number[]) => ({source: 'S-411' as const, s100: {feature: 'SeaIce', attribute: 'totalConcentration', codes}});
const stage = (codes: number[]) => ({source: 'S-411' as const, s100: {feature: 'SeaIce', attribute: 'iceStageofDevelopment', codes}});
const feature = (name: string) => ({source: 'S-411' as const, s100: {feature: name}});

/** The marks of the S-411 line styles (brglne, i_ridg, i_lead, i_crac), in millimetres along a 10 mm period. */
const TRIANGLE = mm([{d: 'M4 2.5L5 0L6 2.5Z', fill: 'main', stroke: 'none'}]);
const RIDGE = mm([
    {d: 'M2.5 2.3H7.5', width: 0.4},
    {d: 'M2.5 1.8L3.75 0L5 1.8L6.25 0L7.5 1.8Z', fill: 'main', stroke: 'none'},
]);
const LEAD = mm([{d: 'M2.5 1.3L4 0.7H6L7.5 0.2M2.5 2.3L4 1.5H6L7.5 1', width: 0.4}]);
const CRACK = mm([{d: 'M2.7 2.3L5.5 0.4L4.5 2.1L7.3 0.2', width: 0.4}]);

/** An S-411 point symbol: 5 by 2.5 mm, drawn in millimetres about its middle. */
const point = (parts: GlyphDef['parts']): GlyphDef => ({parts, box: 5, anchor: [2.5, 1.25], scale: S100_PX_PER_MM / 1.25});

/** The S-411 point symbols with no Appendix M equivalent (its 1.1 Symbols, 1.2.1's where redrawn). */
const KEEL = point([
    {d: 'M0 0.2H5', width: 0.4},
    {d: 'M0 0.7L1.25 2.5L2.5 0.7L3.75 2.5L5 0.7Z', fill: 'main', stroke: 'none'},
]);
const GROUNDED_HUMMOCK = point([
    {d: 'M0 2.3H5M0 1.5H5', width: 0.4},
    {d: 'M0 1L1.25 0L2.5 1L3.75 0L5 1Z', fill: 'main', stroke: 'none'},
]);
const STRIPS_AND_PATCHES = point([{d: 'M1.5 1.7V2.3H0.2V0.2H1.5L3.5 2.3H4.8V0.2H3.5V0.8', width: 0.4}]);
const MELT = point([
    {d: 'M0 0.2H5', width: 0.4},
    {d: 'M0.6 0.2L1.02 0.73L1.52 1.16L1.95 1.5L2.6 1.7L3.25 1.51L3.74 1.22L4.15 0.77L4.6 0.2', width: 0.4},
    {text: '$value', x: 2.5, y: 2.6, size: 1.6},
]);
const LEAD_POINT = point([{d: 'M0 1.3L1.5 0.7H3.5L5 0.2M0 2.3L1.5 1.5H3.5L5 1', width: 0.4}]);
const FRACTURE_POINT = point([{d: 'M0.2 2.3L3 0.4L2 2.1L4.8 0.2', width: 0.4}]);

/** The S-411 iceberg-area symbol: a red triangle, 3 mm. */
const BERG: GlyphDef = {parts: [{d: 'M0 3L1.5 0L3 3Z', fill: 'main', stroke: 'none'}], box: 3, scale: S100_PX_PER_MM / 1.25};

export const S411_SPECS = [
    // The WMO colour code by total concentration (S-411 seaice_iceact style).
    metocSpec('S411IceFree', 'Sea Ice Concentration - Ice Free', IC, 46, null, 'Area1', ['#0064ff'], {...iceArea('#0064ff'), ...conc([1])}),
    metocSpec('S411OpenWater', 'Sea Ice Concentration - Open Water (less than 1/10) or Bergy Water', IC, 46, null, 'Area1', ['#96c8ff'], {...iceArea('#96c8ff'), ...conc([2, 3])}),
    metocSpec('S411VeryOpenDrift', 'Sea Ice Concentration - Very Open Drift (1/10 to 3/10)', IC, 46, null, 'Area1', ['#8cffa0'], {...iceArea('#8cffa0'), ...conc([10, 12, 13, 20, 23, 30])}),
    metocSpec('S411OpenDrift', 'Sea Ice Concentration - Open Drift (4/10 to 6/10)', IC, 46, null, 'Area1', ['#ffff00'], {
        ...iceArea('#ffff00'),
        ...conc([24, 34, 35, 40, 45, 46, 50, 56, 60]),
        note: 'S-411 colours a concentration range by its higher end: 2/10 to 4/10 is open drift, 5/10 to 7/10 close pack.',
    }),
    metocSpec('S411ClosePack', 'Sea Ice Concentration - Close Pack (7/10 to 8/10)', IC, 46, null, 'Area1', ['#ff7d07'], {...iceArea('#ff7d07'), ...conc([57, 67, 68, 70, 78, 80])}),
    metocSpec('S411VeryClosePack', 'Sea Ice Concentration - Very Close Pack (9/10 to 10/10)', IC, 46, null, 'Area1', ['#ff0000'], {...iceArea('#ff0000'), ...conc([79, 81, 89, 90, 91])}),
    metocSpec('S411CompactIce', 'Sea Ice Concentration - Compact or Consolidated (10/10)', IC, 46, null, 'Area1', ['#910000'], {...iceArea('#910000'), ...conc([92])}),
    metocSpec('S411ConcentrationUnknown', 'Sea Ice Concentration - Undetermined', IC, 46, null, 'Area1', ['#000000'], {...iceArea('#000000'), ...conc([99])}),

    // The WMO colour code by stage of development (S-411 seaice_icesod style).
    metocSpec('S411StageIceFree', 'Stage of Development - Ice Free, Brash or None', IC, 46, null, 'Area1', ['#96c8ff'], {...iceArea('#96c8ff'), ...stage([1, 70, 80])}),
    metocSpec('S411NewIce', 'Stage of Development - New Ice (less than 10 cm)', IC, 46, null, 'Area1', ['#f0d2fa'], {...iceArea('#f0d2fa'), ...stage([81])}),
    metocSpec('S411Nilas', 'Stage of Development - Nilas, Ice Rind (less than 10 cm)', IC, 46, null, 'Area1', ['#ff64ff'], {...iceArea('#ff64ff'), ...stage([82])}),
    metocSpec('S411YoungIce', 'Stage of Development - Young Ice (10 to 30 cm)', IC, 46, null, 'Area1', ['#aa28f0'], {...iceArea('#aa28f0'), ...stage([83])}),
    metocSpec('S411GreyIce', 'Stage of Development - Grey Ice (10 to 15 cm)', IC, 46, null, 'Area1', ['#873cd7'], {...iceArea('#873cd7'), ...stage([84])}),
    metocSpec('S411GreyWhiteIce', 'Stage of Development - Grey-White Ice (15 to 30 cm)', IC, 46, null, 'Area1', ['#dc50eb'], {...iceArea('#dc50eb'), ...stage([85])}),
    metocSpec('S411FirstYearIce', 'Stage of Development - First-Year Ice (30 to 200 cm)', IC, 46, null, 'Area1', ['#ffff00'], {...iceArea('#ffff00'), ...stage([86])}),
    metocSpec('S411ThinFirstYearIce', 'Stage of Development - Thin First-Year Ice (30 to 70 cm)', IC, 46, null, 'Area1', ['#ffd200'], {...iceArea('#ffd200'), ...stage([87])}),
    metocSpec('S411ThinFirstYearStage1', 'Stage of Development - Thin First-Year Ice, Stage 1 (30 to 50 cm)', IC, 46, null, 'Area1', ['#d7fa82'], {...iceArea('#d7fa82'), ...stage([88])}),
    metocSpec('S411ThinFirstYearStage2', 'Stage of Development - Thin First-Year Ice, Stage 2 (50 to 70 cm)', IC, 46, null, 'Area1', ['#affa00'], {...iceArea('#affa00'), ...stage([89])}),
    metocSpec('S411MediumFirstYearIce', 'Stage of Development - Medium First-Year Ice (70 to 120 cm)', IC, 46, null, 'Area1', ['#00c814'], {...iceArea('#00c814'), ...stage([91])}),
    metocSpec('S411ThickFirstYearIce', 'Stage of Development - Thick First-Year Ice (over 120 cm) or Residual Ice', IC, 46, null, 'Area1', ['#007800'], {...iceArea('#007800'), ...stage([93, 94])}),
    metocSpec('S411OldIce', 'Stage of Development - Old Ice', IC, 46, null, 'Area1', ['#b46432'], {...iceArea('#b46432'), ...stage([95])}),
    metocSpec('S411SecondYearIce', 'Stage of Development - Second-Year Ice', IC, 46, null, 'Area1', ['#ff780a'], {...iceArea('#ff780a'), ...stage([96])}),
    metocSpec('S411MultiYearIce', 'Stage of Development - Multi-Year Ice', IC, 46, null, 'Area1', ['#c80000'], {...iceArea('#c80000'), ...stage([97])}),
    metocSpec('S411GlacierIce', 'Stage of Development - Glacier Ice (Icebergs)', IC, 46, null, 'Area1', ['#ff0000'], {...iceArea('#ff0000'), ...stage([98])}),
    metocSpec('S411StageUnknown', 'Stage of Development - Undetermined', IC, 46, null, 'Area1', ['#000000'], {...iceArea('#000000'), ...stage([99])}),

    metocSpec('S411IcebergArea', 'Iceberg Area', IC, 46, null, 'Area1', [BLACK, '#ff0000'], {
        areaStyle: {outline: {color: 'main', widthPx: THIN}, pattern: {glyph: {...BERG, parts: [{...BERG.parts[0], fill: '#ff0000'}]}, spacingPx: PERIOD_PX}},
        ...feature('IcebergArea'),
        note: 'S-411 fills an iceberg area with its 3 mm red triangle on a 10 mm grid; the thin black outline is S-411 1.2.1\'s line for iceberg features, so the area can be seen and picked at its edge.',
    }),

    // Point symbols S-411 draws and Appendix M has no symbol for.
    metocSpec('S411IceKeel', 'Ice Keel/Bummock', IC, 46, null, 'Point3', [BLACK], {glyph: KEEL, ...feature('IceKeelBummock')}),
    metocSpec('S411GroundedHummock', 'Grounded Hummock', IC, 46, null, 'Point3', [BLACK], {glyph: GROUNDED_HUMMOCK, ...feature('GroundedHummock')}),
    metocSpec('S411StripsAndPatches', 'Strips and Patches', IC, 46, null, 'Point3', [BLACK], {glyph: STRIPS_AND_PATCHES, ...feature('StripsAndPatches')}),
    metocSpec('S411StageOfMelt', 'Stage of Melt', IC, 46, null, 'Point3', [BLACK], {
        glyph: MELT,
        valueField: {label: 'Melt stage (code 1-10)', placeholder: '2'},
        ...feature('StageOfMelt'),
        note: 'S-411 1.1 writes the melt stage code with the symbol (1 few puddles to 10 no melt); it is written under the curve.',
    }),
    metocSpec('S411IceLeadPoint', 'Ice Lead', IC, 46, null, 'Point3', [BLACK], {glyph: LEAD_POINT, ...feature('IceLead')}),
    metocSpec('S411IceFracturePoint', 'Ice Fracture', IC, 46, null, 'Point3', [BLACK], {glyph: FRACTURE_POINT, ...feature('IceFracture')}),

    // Lines: the ice edge and limits plain (black, red, green), the rest the S-411 line styles.
    metocSpec('S411IceEdge', 'Ice Edge', IC, 46, null, 'Line1', [BLACK], {...plain(), ...feature('IceEdge')}),
    metocSpec('S411LimitOfOpenWater', 'Limit of Open Water', IC, 46, null, 'Line1', ['#ff0000'], {...plain(), ...feature('LimitOfOpenWater')}),
    metocSpec('S411LimitOfAllKnownIce', 'Limit of All Known Ice', IC, 46, null, 'Line1', ['#00ff00'], {...plain(), ...feature('LimitOfAllKnownIce')}),
    metocSpec('S411IcebergLimit', 'Iceberg Limit', IC, 46, null, 'Line1', [BLACK], {...marked(TRIANGLE), ...feature('IcebergLimit')}),
    metocSpec('S411IceRidgeLine', 'Line of Ice Ridge', IC, 46, null, 'Line1', [BLACK], {...marked(RIDGE), ...feature('LineOfIceRidge')}),
    metocSpec('S411IceLeadLine', 'Line of Ice Lead', IC, 46, null, 'Line1', [BLACK], {...marked(LEAD), ...feature('LineOfIceLead')}),
    metocSpec('S411IceFractureLine', 'Line of Ice Fracture', IC, 46, null, 'Line1', [BLACK], {
        ...marked(CRACK),
        ...feature('LineOfIceFracture'),
        note: 'S-411 draws a fracture and a crack with one line style; its attributes, not its line, tell them apart.',
    }),
    metocSpec('S411IceCrackLine', 'Line of Ice Crack', IC, 46, null, 'Line1', [BLACK], {...marked(CRACK), ...feature('LineOfIceCrack')}),
] as const;
