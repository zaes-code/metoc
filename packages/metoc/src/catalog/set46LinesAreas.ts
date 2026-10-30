/**
 * Symbol set 46 (Oceanographic) lines and areas, as styles: ice limits and openings, depth and
 * coast, ports, aids, hazards, currents, bioluminescence, beach slope, mine-warfare bottom
 * descriptors, maritime limits and man-made structures (Table A-LII, Table M-III).
 *
 * Where a colour *is* the information — a VDR level, a bottom sediment or category — it is the
 * exact RGB the standard prints, and no palette moves it. Two rows print a colour name that
 * disagrees with their own RGB; those follow the name and their drawing, and say so in `note`.
 */

import {MetocCategory, metocSpec, type AreaStyleDef, type GlyphDef, type LineStyleDef, type MetocColor} from '../core/specTypes.js';
import {DEEP_BLUE, WATER_BLUE} from './set46Points.js';

const ICE = MetocCategory.Ice;
const DEP = MetocCategory.Depth;
const POR = MetocCategory.Ports;
const NAV = MetocCategory.AidsToNavigation;
const HAZ = MetocCategory.Hazards;
const TID = MetocCategory.TideCurrent;
const BIO = MetocCategory.Bioluminescence;
const BCH = MetocCategory.BeachSlope;
const MIW = MetocCategory.MineWarfareBottom;
const LIM = MetocCategory.MaritimeLimits;
const MAN = MetocCategory.ManMade;

const L = (style: LineStyleDef) => ({lineStyle: style});
const A = (style: AreaStyleDef) => ({areaStyle: style});

const CHART_GRAY = 'rgb(160, 160, 160)' as const;
const YELLOW_GREEN = 'rgb(128, 255, 0)' as const;
const ORANGE = 'rgb(255, 128, 0)' as const;

/** Small marks repeated along limits and outlines. */
const ELLIPSE: GlyphDef = {parts: [{d: 'M5 12A7 3 0 1 0 19 12A7 3 0 1 0 5 12Z', width: 1.6}]};
const ELLIPSE_X: GlyphDef = {parts: [{d: 'M1 12A5 2.4 0 1 0 11 12A5 2.4 0 1 0 1 12Z', width: 1.6}, {d: 'M14 10L18 14M18 10L14 14', width: 1.6}], anchor: [9.5, 12]};
const CUP: GlyphDef = {parts: [{d: 'M5 9A7 7 0 0 0 19 9', width: 1.8}]};
const CROSS: GlyphDef = {parts: [{d: 'M7 7L17 17M17 7L7 17', width: 2.4}]};
const SMALL_CUP: GlyphDef = {parts: [{d: 'M7 12H17A5 5 0 0 1 7 12Z', width: 1.4}], scale: 0.7};
const ANCHOR: GlyphDef = {
    parts: [
        {d: 'M12 3.5V20.5M7.5 6.5H16.5', width: 2},
        {d: 'M4 14.5Q4.5 20.5 12 20.5Q19.5 20.5 20 14.5', width: 2},
    ],
};
const DOT: GlyphDef = {parts: [{circle: [12, 12, 4], fill: 'main'}], scale: 0.8};
const HASH: GlyphDef = {parts: [{d: 'M9.5 4L8.5 20M15.5 4L14.5 20M5 9H19.5M4.5 15H19', width: 1.4}], scale: 0.6};
const KELP: GlyphDef = {parts: [{d: 'M2 12.5C8 11.5 14 13.5 22 11M6 12.2L3 9M6 12.2L4 15.5M12.5 12.6L9.5 8.5M16.5 12.2L19.5 9', width: 1.4}], scale: 0.75};
const FISH_TRAP: GlyphDef = {parts: [{d: 'M6 10H14V15H6ZM6 10L4 7M14 10L16 7', width: 1.2}], scale: 0.8};
const ATTENTION: GlyphDef = {parts: [{circle: [12, 12, 8], width: 1.6}, {d: 'M12 6.5V13.5', width: 2}, {circle: [12, 17, 1.2], fill: 'main'}]};
const RIM = {color: CHART_GRAY, widthPx: 1} as const;

/** A solid fill in an exact colour with a thin grey rim, as the bottom-descriptor icons draw it. */
const fill = (color: MetocColor) => A({fill: {color}, outline: RIM});

export const SET46_LINE_AREA_SPECS = [
    // Ice limits and openings (Line1).
    metocSpec('LimitsVisualObservation', 'Limits - Limits of Visual Observation', ICE, 46, '110501', 'Line1', ['black'], L({color: 'main', hideLine: true, decorations: [{kind: 'glyph', glyph: ELLIPSE, spacingPx: 20}]})),
    metocSpec('LimitsUndercast', 'Limits - Limits of Undercast', ICE, 46, '110502', 'Line1', ['black'], L({color: 'main', hideLine: true, decorations: [{kind: 'glyph', glyph: CUP, spacingPx: 17}]})),
    metocSpec('LimitsRadarObservation', 'Limits - Limits of Radar Observation', ICE, 46, '110503', 'Line1', ['black'], L({color: 'main', hideLine: true, decorations: [{kind: 'glyph', glyph: ELLIPSE_X, spacingPx: 26}]})),
    metocSpec('ObservedIceEdge', 'Limits - Observed Ice Edge or Boundary', ICE, 46, '110504', 'Line1', ['black'], L({color: 'main', widthPx: 2.5})),
    metocSpec('EstimatedIceEdge', 'Limits - Estimated Ice Edge or Boundary', ICE, 46, '110505', 'Line1', ['black'], L({color: 'main', widthPx: 2.5, dash: [7, 4]})),
    metocSpec('IceEdgeFromRadar', 'Limits - Ice Edge or Boundary From Radar', ICE, 46, '110506', 'Line1', ['black'], L({color: 'main', widthPx: 2.5, decorations: [{kind: 'glyph', glyph: CROSS, spacingPx: 34}]})),
    metocSpec('IceCracks', 'Openings in the Ice - Cracks', ICE, 46, '110601', 'Line1', ['black'], L({color: 'main', widthPx: 1.3})),
    metocSpec('IceCracksSpecific', 'Openings in the Ice - Cracks at a Specific Location', ICE, 46, '110602', 'Line1', ['black'], L({color: 'main', widthPx: 1.3, decorations: [{kind: 'ticks', side: 0, lengthPx: 11, spacingPx: 12}]})),
    // A lead is a channel of open water: a double line, drawn as a wide stroke with the halo inside.
    metocSpec('IceLead', 'Openings in the Ice - Lead', ICE, 46, '110603', 'Line1', ['black'], L({color: 'halo', widthPx: 4, casing: {color: 'main', widthPx: 7}})),
    metocSpec('IceFrozenLead', 'Openings in the Ice - Frozen Lead', ICE, 46, '110604', 'Line1', ['black'], L({
        color: 'halo',
        widthPx: 7,
        casing: {color: 'main', widthPx: 10},
        decorations: [{kind: 'ticks', side: 0, lengthPx: 8, spacingPx: 14}],
    })),

    // Depth and coast.
    metocSpec('DepthCurve', 'Depth - Depth Curve', DEP, 46, '120102', 'Line1', [CHART_GRAY], {...L({color: 'main', widthPx: 1.3}), valueField: {label: 'Depth', placeholder: '20'}}),
    metocSpec('DepthContour', 'Depth - Depth Contour', DEP, 46, '120103', 'Line1', [CHART_GRAY], {...L({color: 'main', widthPx: 1.3}), valueField: {label: 'Depth', placeholder: '20'}}),
    metocSpec('DepthArea', 'Depth - Depth Area', DEP, 46, '120104', 'Area2', ['rgb(30, 110, 255)'], A({fill: {color: 'rgb(102, 178, 255)', opacity: 0.55}, outline: {color: 'main', widthPx: 4}})),
    metocSpec('Coastline', 'Coastal Hydrography - Coastline', DEP, 46, '120201', 'Line1', [CHART_GRAY], L({color: 'main', widthPx: 1.6})),
    metocSpec('Island', 'Coastal Hydrography - Island', DEP, 46, '120202', 'Area2', ['rgb(210, 170, 100)'], A({fill: {color: 'main'}, outline: null})),
    metocSpec('Beach', 'Coastal Hydrography - Beach', DEP, 46, '120203', 'Area2', ['rgb(210, 160, 140)'], A({
        fill: {color: 'rgb(250, 240, 235)'},
        outline: {color: 'main', widthPx: 2},
        dots: {color: 'rgb(210, 160, 140)', spacingPx: 9, radiusPx: 0.8},
    })),
    metocSpec('Water', 'Coastal Hydrography - Water', DEP, 46, '120204', 'Area2', ['white'], A({fill: {color: 'white'}, outline: null})),
    metocSpec('ForeshoreLine', 'Coastal Hydrography - Foreshore - Line', DEP, 46, '120205', 'Line1', [YELLOW_GREEN], L({color: 'main', widthPx: 3})),
    metocSpec('ForeshoreArea', 'Coastal Hydrography - Foreshore - Area', DEP, 46, '120206', 'Area2', [YELLOW_GREEN], A({fill: {color: 'main'}, outline: null})),

    // Ports and harbours.
    metocSpec('AnchorageLine', 'Ports - Anchorage - Line', POR, 46, '120305', 'Line8', ['magenta'], L({
        color: 'main',
        widthPx: 1.5,
        dash: [6, 4],
        decorations: [
            {kind: 'glyph', glyph: SMALL_CUP, spacingPx: 22},
            {kind: 'glyph', glyph: ANCHOR, spacingPx: 0, at: 'middle'},
        ],
    })),
    metocSpec('AnchorageArea', 'Ports - Anchorage - Area', POR, 46, '120306', 'Area2', ['magenta'], A({
        outline: {color: 'main', widthPx: 1.5, dash: [6, 4]},
        outlineGlyph: {glyph: SMALL_CUP, spacingPx: 18},
        centerGlyph: ANCHOR,
    })),
    metocSpec('PierWharfQuay', 'Ports - Pier/Wharf/Quay', POR, 46, '120308', 'Line1', [CHART_GRAY], L({color: 'main', widthPx: 2})),
    metocSpec('FishTrapsArea', 'Ports and Harbors - Fish Traps - Area', POR, 46, '120312', 'Area2', [CHART_GRAY], A({
        outline: {color: 'main', widthPx: 1.5, dash: [5, 3]},
        pattern: {glyph: FISH_TRAP, spacingPx: 34},
    })),
    metocSpec('Drydock', 'Facilities - Drydock', POR, 46, '120314', 'Area2', ['rgb(190, 150, 60)'], A({fill: {color: 'main'}, outline: {color: 'black', widthPx: 2, dash: [5, 3]}})),
    metocSpec('OffshoreLoadingLine', 'Facilities - Offshore Loading Facility - Line', POR, 46, '120317', 'Line1', [CHART_GRAY], L({color: 'main', widthPx: 5})),
    metocSpec('OffshoreLoadingArea', 'Facilities - Offshore Loading Facility - Area', POR, 46, '120318', 'Area2', ['rgb(190, 150, 60)'], A({fill: {color: 'main'}, outline: null})),
    metocSpec('RampAboveWater', 'Facilities - Ramp - Above Water', POR, 46, '120319', 'Line1', ['black'], L({color: 'main', widthPx: 2})),
    metocSpec('RampBelowWater', 'Facilities - Ramp - Below Water', POR, 46, '120320', 'Line1', ['black'], L({color: 'main', widthPx: 2, dash: [6, 4]})),
    metocSpec('BreakwaterAboveWater', 'Shoreline Protection - Breakwater/Groin/Jetty - Above Water', POR, 46, '120326', 'Line1', ['gray'], L({color: 'main', widthPx: 2.5})),
    metocSpec('BreakwaterBelowWater', 'Shoreline Protection - Breakwater/Groin/Jetty - Below Water', POR, 46, '120327', 'Line1', ['gray'], L({color: 'main', widthPx: 2.5, dash: [6, 4]})),
    metocSpec('Seawall', 'Shoreline Protection - Seawall', POR, 46, '120328', 'Line1', ['gray'], L({color: 'main', widthPx: 1.5})),

    // Aids to navigation and hazards.
    metocSpec('PerchesStakesArea', 'Aids to Navigation - Perches/Stakes - Area', NAV, 46, '120405', 'Area2', [DEEP_BLUE], A({fill: {color: 'main'}, outline: {color: 'black', widthPx: 1.5, dash: [1, 2]}})),
    metocSpec('LeadingLine', 'Aids to Navigation - Leading Line', NAV, 46, '120407', 'Line1', ['black'], L({color: 'main', widthPx: 2, dash: [6, 4], decorations: [{kind: 'solidThenDashed', split: 0.55}]})),
    metocSpec('UnderwaterDanger', 'Dangers/Hazards - Underwater Danger/Hazard', HAZ, 46, '120503', 'Area2', [WATER_BLUE], A({fill: {color: 'main'}, outline: {color: 'black', widthPx: 1.5, dash: [1, 2]}})),
    metocSpec('FoulGroundArea', 'Dangers/Hazards - Foul Ground - Area', HAZ, 46, '120505', 'Area2', ['gray'], A({outline: null, pattern: {glyph: HASH, spacingPx: 30}})),
    metocSpec('KelpArea', 'Dangers/Hazards - Kelp/Seaweed - Area', HAZ, 46, '120507', 'Area2', ['gray'], A({outline: null, pattern: {glyph: KELP, spacingPx: 34}})),
    metocSpec('Breakers', 'Dangers/Hazards - Breakers', HAZ, 46, '120511', 'Line1', [CHART_GRAY], L({color: 'main', widthPx: 1.5, dash: [5, 4]})),
    metocSpec('Reef', 'Dangers/Hazards - Reef', HAZ, 46, '120512', 'Line1', ['black'], L({color: 'main', widthPx: 1.4, decorations: [{kind: 'zigzag', amplitudePx: 11, wavelengthPx: 9}]})),
    metocSpec('DiscoloredWater', 'Dangers/Hazards - Discolored Water', HAZ, 46, '120514', 'Area2', [WATER_BLUE], A({fill: {color: 'main'}, outline: {color: 'black', widthPx: 1.5, dash: [1, 2]}})),

    // Currents: an arrow, with no feather on the ebb and one on the flood.
    metocSpec('CurrentFlowEbb', 'Tide and Current - Current Flow - Ebb', TID, 46, '120702', 'Line1', [CHART_GRAY], L({color: 'main', widthPx: 1.8, decorations: [{kind: 'arrow', sizePx: 11}]})),
    metocSpec('CurrentFlowFlood', 'Tide and Current - Current Flow - Flood', TID, 46, '120703', 'Line1', [CHART_GRAY], L({color: 'main', widthPx: 1.8, decorations: [{kind: 'arrow', sizePx: 11, feathers: 1}]})),

    // Bioluminescence: visual detection ratio levels, read by colour.
    metocSpec('VdrLevel1to2', 'Bioluminescence - VDR Level 1-2', BIO, 46, '130101', 'Area2', ['rgb(26, 153, 77)'], A({fill: {color: 'main'}, outline: null})),
    metocSpec('VdrLevel2to3', 'Bioluminescence - VDR Level 2-3', BIO, 46, '130102', 'Area2', ['rgb(26, 204, 77)'], A({fill: {color: 'main'}, outline: null})),
    metocSpec('VdrLevel3to4', 'Bioluminescence - VDR Level 3-4', BIO, 46, '130103', 'Area2', ['rgb(128, 255, 51)'], A({fill: {color: 'main'}, outline: null})),
    metocSpec('VdrLevel4to5', 'Bioluminescence - VDR Level 4-5', BIO, 46, '130104', 'Area2', ['rgb(204, 255, 26)'], A({fill: {color: 'main'}, outline: null})),
    metocSpec('VdrLevel5to6', 'Bioluminescence - VDR Level 5-6', BIO, 46, '130105', 'Area2', ['rgb(255, 255, 0)'], A({fill: {color: 'main'}, outline: null})),
    metocSpec('VdrLevel6to7', 'Bioluminescence - VDR Level 6-7', BIO, 46, '130106', 'Area2', ['rgb(255, 204, 0)'], A({fill: {color: 'main'}, outline: null})),
    metocSpec('VdrLevel7to8', 'Bioluminescence - VDR Level 7-8', BIO, 46, '130107', 'Area2', ['rgb(255, 128, 0)'], A({fill: {color: 'main'}, outline: null})),
    metocSpec('VdrLevel8to9', 'Bioluminescence - VDR Level 8-9', BIO, 46, '130108', 'Area2', ['rgb(255, 77, 0)'], A({fill: {color: 'main'}, outline: null})),
    metocSpec('VdrLevel9to10', 'Bioluminescence - VDR Level 9-10', BIO, 46, '130109', 'Area2', ['rgb(255, 0, 0)'], A({fill: {color: 'main'}, outline: null})),

    // Beach slope.
    metocSpec('BeachSlopeFlat', 'Beach Slope - Flat', BCH, 46, '130201', 'Area2', ['rgb(200, 200, 200)'], A({outline: {color: 'main', widthPx: 2}})),
    metocSpec('BeachSlopeGentle', 'Beach Slope - Gentle', BCH, 46, '130202', 'Area2', ['rgb(130, 130, 130)'], A({outline: {color: 'main', widthPx: 2}})),
    metocSpec('BeachSlopeModerate', 'Beach Slope - Moderate', BCH, 46, '130203', 'Area2', ['rgb(150, 150, 150)'], A({
        outline: {color: 'main', widthPx: 1.5},
        dots: {color: 'rgb(200, 200, 200)', spacingPx: 8, radiusPx: 1},
    })),
    metocSpec('BeachSlopeSteep', 'Beach Slope - Steep', BCH, 46, '130204', 'Area2', ['rgb(150, 150, 150)'], A({
        outline: {color: 'main', widthPx: 1.5},
        dots: {color: 'rgb(120, 120, 120)', spacingPx: 8, radiusPx: 1},
    })),

    // Mine warfare bottom descriptors: solid fills in the standard's exact colours.
    metocSpec('MiwSolidRock', 'MIW Bottom Sediments - Solid Rock', MIW, 46, '140101', 'Area2', ['rgb(255, 0, 255)'], fill('rgb(255, 0, 255)')),
    metocSpec('MiwClay', 'MIW Bottom Sediments - Clay', MIW, 46, '140102', 'Area2', ['rgb(100, 130, 255)'], fill('rgb(100, 130, 255)')),
    metocSpec('MiwVeryCoarseSand', 'MIW Bottom Sediments - Very Coarse Sand', MIW, 46, '140103', 'Area2', ['rgb(255, 180, 0)'], fill('rgb(255, 180, 0)')),
    metocSpec('MiwCoarseSand', 'MIW Bottom Sediments - Coarse Sand', MIW, 46, '140104', 'Area2', ['rgb(255, 215, 0)'], fill('rgb(255, 215, 0)')),
    metocSpec('MiwMediumSand', 'MIW Bottom Sediments - Medium Sand', MIW, 46, '140105', 'Area2', ['rgb(255, 235, 0)'], fill('rgb(255, 235, 0)')),
    metocSpec('MiwFineSand', 'MIW Bottom Sediments - Fine Sand', MIW, 46, '140106', 'Area2', ['rgb(255, 255, 140)'], fill('rgb(255, 255, 140)')),
    metocSpec('MiwVeryFineSand', 'MIW Bottom Sediments - Very Fine Sand', MIW, 46, '140107', 'Area2', ['rgb(255, 255, 220)'], fill('rgb(255, 255, 220)')),
    metocSpec('MiwVeryFineSilt', 'MIW Bottom Sediments - Very Fine Silt', MIW, 46, '140108', 'Area2', ['rgb(0, 215, 255)'], fill('rgb(0, 215, 255)')),
    metocSpec('MiwFineSilt', 'MIW Bottom Sediments - Fine Silt', MIW, 46, '140109', 'Area2', ['rgb(25, 255, 230)'], fill('rgb(25, 255, 230)')),
    metocSpec('MiwMediumSilt', 'MIW Bottom Sediments - Medium Silt', MIW, 46, '140110', 'Area2', ['rgb(0, 255, 0)'], fill('rgb(0, 255, 0)')),
    metocSpec('MiwCoarseSilt', 'MIW Bottom Sediments - Coarse Silt', MIW, 46, '140111', 'Area2', ['rgb(200, 255, 105)'], fill('rgb(200, 255, 105)')),
    metocSpec('MiwBoulders', 'MIW Bottom Sediments - Boulders', MIW, 46, '140112', 'Area2', ['rgb(255, 0, 0)'], fill('rgb(255, 0, 0)')),
    metocSpec('MiwCobblesOysterShells', 'MIW Bottom Sediments - Cobbles, Oyster Shells', MIW, 46, '140113', 'Area2', ['rgb(255, 150, 150)'], fill('rgb(255, 150, 150)')),
    metocSpec('MiwPebblesShells', 'MIW Bottom Sediments - Pebbles, Shells', MIW, 46, '140114', 'Area2', ['rgb(255, 190, 190)'], fill('rgb(255, 190, 190)')),
    metocSpec('MiwSandAndShells', 'MIW Bottom Sediments - Sand and Shells', MIW, 46, '140115', 'Area2', ['rgb(255, 220, 220)'], fill('rgb(255, 220, 220)')),
    metocSpec('MiwLand', 'MIW Bottom Sediments - Land', MIW, 46, '140116', 'Area2', ['rgb(220, 220, 220)'], fill('rgb(220, 220, 220)')),
    metocSpec('MiwNoData', 'MIW Bottom Sediments - No Data', MIW, 46, '140117', 'Area2', ['rgb(230, 230, 230)'], fill('rgb(230, 230, 230)')),
    metocSpec('MiwRoughnessSmooth', 'Bottom Roughness - Smooth', MIW, 46, '140118', 'Area2', ['rgb(0, 255, 0)'], fill('rgb(0, 255, 0)')),
    metocSpec('MiwRoughnessModerate', 'Bottom Roughness - Moderate', MIW, 46, '140119', 'Area2', ['rgb(255, 255, 0)'], fill('rgb(255, 255, 0)')),
    metocSpec('MiwRoughnessRough', 'Bottom Roughness - Rough', MIW, 46, '140120', 'Area2', ['rgb(255, 0, 0)'], {
        ...fill('rgb(255, 0, 0)'),
        note: 'The standard prints "Red (RGB 0:255:0)"; the RGB is green. Drawn red, as named and as its icon shows.',
    }),
    metocSpec('MiwClutterLow', 'Clutter (Bottom) - Low', MIW, 46, '140121', 'Area2', ['rgb(0, 255, 0)'], {
        ...fill('rgb(0, 255, 0)'),
        note: 'The standard prints "Green (RGB 255:255:0)"; the RGB is yellow. Drawn green, as named and as its icon shows.',
    }),
    metocSpec('MiwClutterMedium', 'Clutter (Bottom) - Medium', MIW, 46, '140122', 'Area2', ['rgb(255, 255, 0)'], fill('rgb(255, 255, 0)')),
    metocSpec('MiwClutterHigh', 'Clutter (Bottom) - High', MIW, 46, '140123', 'Area2', ['rgb(255, 0, 0)'], fill('rgb(255, 0, 0)')),
    metocSpec('MiwImpactBurial0', 'Impact Burial - 0%', MIW, 46, '140124', 'Area2', ['rgb(0, 0, 255)'], fill('rgb(0, 0, 255)')),
    metocSpec('MiwImpactBurial0to10', 'Impact Burial - 0-10%', MIW, 46, '140125', 'Area2', ['rgb(0, 255, 0)'], fill('rgb(0, 255, 0)')),
    metocSpec('MiwImpactBurial10to20', 'Impact Burial - 10-20%', MIW, 46, '140126', 'Area2', ['rgb(255, 255, 0)'], fill('rgb(255, 255, 0)')),
    metocSpec('MiwImpactBurial20to75', 'Impact Burial - 20-75%', MIW, 46, '140127', 'Area2', ['rgb(255, 127, 0)'], fill('rgb(255, 127, 0)')),
    metocSpec('MiwImpactBurialOver75', 'Impact Burial - >75%', MIW, 46, '140128', 'Area2', ['rgb(255, 0, 0)'], fill('rgb(255, 0, 0)')),
    metocSpec('MiwCategoryA', 'MIW Bottom Category - A', MIW, 46, '140129', 'Area2', ['rgb(0, 255, 0)'], fill('rgb(0, 255, 0)')),
    metocSpec('MiwCategoryB', 'MIW Bottom Category - B', MIW, 46, '140130', 'Area2', ['rgb(255, 255, 0)'], fill('rgb(255, 255, 0)')),
    metocSpec('MiwCategoryC', 'MIW Bottom Category - C', MIW, 46, '140131', 'Area2', ['rgb(255, 0, 0)'], fill('rgb(255, 0, 0)')),
    metocSpec('MiwTypeA1', 'MIW Bottom Type - A1', MIW, 46, '140132', 'Area2', ['rgb(48, 255, 0)'], fill('rgb(48, 255, 0)')),
    metocSpec('MiwTypeA2', 'MIW Bottom Type - A2', MIW, 46, '140133', 'Area2', ['rgb(127, 255, 0)'], fill('rgb(127, 255, 0)')),
    metocSpec('MiwTypeA3', 'MIW Bottom Type - A3', MIW, 46, '140134', 'Area2', ['rgb(175, 255, 0)'], fill('rgb(175, 255, 0)')),
    metocSpec('MiwTypeB1', 'MIW Bottom Type - B1', MIW, 46, '140135', 'Area2', ['rgb(207, 255, 0)'], fill('rgb(207, 255, 0)')),
    metocSpec('MiwTypeB2', 'MIW Bottom Type - B2', MIW, 46, '140136', 'Area2', ['rgb(255, 255, 0)'], fill('rgb(255, 255, 0)')),
    metocSpec('MiwTypeB3', 'MIW Bottom Type - B3', MIW, 46, '140137', 'Area2', ['rgb(255, 207, 0)'], fill('rgb(255, 207, 0)')),
    metocSpec('MiwTypeC1', 'MIW Bottom Type - C1', MIW, 46, '140138', 'Area2', ['rgb(255, 127, 0)'], fill('rgb(255, 127, 0)')),
    metocSpec('MiwTypeC2', 'MIW Bottom Type - C2', MIW, 46, '140139', 'Area2', ['rgb(255, 80, 0)'], fill('rgb(255, 80, 0)')),
    metocSpec('MiwTypeC3', 'MIW Bottom Type - C3', MIW, 46, '140140', 'Area2', ['rgb(255, 48, 0)'], fill('rgb(255, 48, 0)')),

    // Maritime limits.
    metocSpec('MaritimeLimitBoundary', 'Limits - Maritime Limit Boundary', LIM, 46, '150100', 'Line1', ['magenta'], L({color: 'main', widthPx: 2, dash: [3, 3]})),
    metocSpec('MaritimeArea', 'Limits - Maritime Area', LIM, 46, '150200', 'Area2', ['magenta'], A({outline: {color: 'main', widthPx: 2.5, dash: [2, 3]}})),
    metocSpec('RestrictedArea', 'Limits - Restricted Area', LIM, 46, '150300', 'Line1', ['magenta'], L({color: 'main', widthPx: 1.6, decorations: [{kind: 'ticks', side: -1, lengthPx: 7, spacingPx: 11}]})),
    metocSpec('SweptArea', 'Limits - Swept Area', LIM, 46, '150400', 'Area2', ['magenta'], A({outline: null, dots: {color: 'main', spacingPx: 22, radiusPx: 3.5}})),
    metocSpec('TrainingArea', 'Limits - Training Area', LIM, 46, '150500', 'Area2', ['magenta'], A({outline: {color: 'main', widthPx: 2, dash: [3, 3]}, centerGlyph: ATTENTION})),
    metocSpec('OperatorDefinedMaritimeArea', 'Limits - Operator-Defined', LIM, 46, '150600', 'Area2', [ORANGE], {
        ...A({outline: {color: 'main', widthPx: 2}}),
        operatorColor: true,
        operatorDash: true,
    }),

    // Man-made structures.
    metocSpec('SubmarineCable', 'Man-Made Structures - Submarine Cable', MAN, 46, '160100', 'Line1', ['magenta'], L({color: 'main', widthPx: 2, decorations: [{kind: 'wave', amplitudePx: 6, wavelengthPx: 22}]})),
    metocSpec('SubmergedCrib', 'Man-Made Structures - Submerged Crib', MAN, 46, '160200', 'Area2', [DEEP_BLUE], A({fill: {color: 'main'}, outline: {color: 'black', widthPx: 1.5, dash: [1, 2]}})),
    metocSpec('Canal', 'Man-Made Structures - Canal', MAN, 46, '160300', 'Line1', ['black'], L({color: 'main', widthPx: 5})),
    metocSpec('OilGasRigField', 'Man-Made Structures - Oil/Gas Rig Field', MAN, 46, '160700', 'Area2', [CHART_GRAY], A({outline: null, dots: {color: 'main', spacingPx: 12, radiusPx: 1.6}})),
    metocSpec('Pipeline', 'Man-Made Structures - Pipelines/Pipe', MAN, 46, '160800', 'Line1', [CHART_GRAY], L({color: 'main', widthPx: 2, dash: [8, 8], decorations: [{kind: 'glyph', glyph: DOT, spacingPx: 16}]})),
] as const;
