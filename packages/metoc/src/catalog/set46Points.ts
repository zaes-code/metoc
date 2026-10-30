/**
 * Symbol set 46 (Oceanographic) point symbols drawn from their Table M-III icons: ice systems,
 * soundings, ports and harbours, aids to navigation, dangers, bottom characteristics, tide and
 * current, and man-made structures. Authored in a 24-unit box from the standard's drawings.
 *
 * Several icons in this set carry exact colours the standard names (the "Blue" fill of a submerged
 * rock, the dark brown of a dolphin) that are not palette roles; they are stated as CSS colours.
 */

import {MetocCategory, metocSpec, type GlyphDef, type GlyphPart} from '../core/specTypes.js';

const ICE = MetocCategory.Ice;
const DEP = MetocCategory.Depth;
const POR = MetocCategory.Ports;
const NAV = MetocCategory.AidsToNavigation;
const HAZ = MetocCategory.Hazards;
const BOT = MetocCategory.Bottom;
const TID = MetocCategory.TideCurrent;
const MAN = MetocCategory.ManMade;

const g = (...parts: (GlyphPart | GlyphPart[])[]): GlyphDef => ({parts: parts.flat()});
const line = (d: string, width = 1.6): GlyphPart => ({d, width});
const solid = (d: string): GlyphPart => ({d, fill: 'main'});
const v = (label: string, placeholder: string) => ({label, placeholder});

/** Chart blues and browns the standard names. */
const WATER_BLUE = 'rgb(0, 191, 255)' as const;
const DEEP_BLUE = 'rgb(0, 0, 255)' as const;
const DARK_BROWN = 'rgb(153, 51, 0)' as const;

/** Three staggered strokes: open water, in the ice-concentration symbols. */
const WATER_LINES = line('M1 9H9M3 12H11M1 15H9', 1.4);
/** A filled arrowhead pointing right with its tip at (x, y). */
const head = (x: number, y: number, dir = 1): GlyphPart => solid(`M${x} ${y}L${x - dir * 4} ${y - 3}V${y + 3}Z`);
/** The chart anchor. */
const ANCHOR = [line('M12 3.5V20.5M7.5 6.5H16.5', 2), line('M4 14.5Q4.5 20.5 12 20.5Q19.5 20.5 20 14.5', 2)];
/** A dotted outline: the "black dotted outline" of the hazard fills. */
const dotted = (d: string, fill: `rgb(${string})`): GlyphPart[] => [{d, fill}, {d, stroke: 'black', width: 1, dash: [0.9, 0.9]}];
/** Bottom characteristic abbreviations, as chart type. */
const abbrev = (text: string): GlyphDef => g({text, x: 12, y: 12.5, size: 13});

export const SET46_POINT_SPECS = [
    // Ice systems (Point3).
    metocSpec('ManyIcebergs', 'Icebergs - Many Icebergs', ICE, 46, '110101', 'Point3', ['black'], {glyph: g(solid('M3.5 19L10.5 6.5L17.5 19Z'), {circle: [21, 18, 1.3], fill: 'main'})}),
    metocSpec('IcebergBeltsStrips', 'Icebergs - Belts and Strips', ICE, 46, '110102', 'Point3', ['black'], {glyph: g(line('M3 14C6 7.5 10 8.5 12 11.5C14 14.5 18 15.5 21 9', 3))}),
    metocSpec('IcebergGeneral', 'Icebergs - General', ICE, 46, '110103', 'Point3', ['black'], {glyph: g(line('M4 19L12 5L20 19Z'))}),
    metocSpec('ManyIcebergsGeneral', 'Icebergs - Many Icebergs, General', ICE, 46, '110104', 'Point3', ['black'], {glyph: g(solid('M4 19L12 5L20 19Z'))}),
    metocSpec('BergyBit', 'Icebergs - Bergy Bit', ICE, 46, '110105', 'Point3', ['black'], {glyph: g(line('M7 6.5H17L20 15.5H4Z'), line('M3 19H21'))}),
    metocSpec('ManyBergyBits', 'Icebergs - Many Bergy Bits', ICE, 46, '110106', 'Point3', ['black'], {glyph: g(solid('M7 6.5H17L20 15.5H4Z'), line('M3 19H21'))}),
    metocSpec('Growler', 'Icebergs - Growler', ICE, 46, '110107', 'Point3', ['black'], {glyph: g(line('M7 8H17L20 17H4Z'))}),
    metocSpec('ManyGrowlers', 'Icebergs - Many Growlers', ICE, 46, '110108', 'Point3', ['black'], {glyph: g(solid('M7 8H17L20 17H4Z'))}),
    metocSpec('Floeberg', 'Icebergs - Floeberg', ICE, 46, '110109', 'Point3', ['black'], {
        glyph: g(line('M5 20.5L12 6L19 20.5Z'), solid('M12 6L14.9 12H9.1Z'), line('M3 12H21')),
    }),
    metocSpec('IceIsland', 'Icebergs - Ice Island', ICE, 46, '110110', 'Point3', ['black'], {
        glyph: g(
            line('M7 4H17L22 12L17 20H7L2 12Z', 1.4),
            line('M5 8L11 20M7 4L15 20M11 4L18 18M15 4L20 14M3.5 14.5L6 20', 0.8),
            line('M19 8L13 20M17 4L9 20M13 4L6 18M9 4L4 14M20.5 14.5L18 20', 0.8),
        ),
    }),
    metocSpec('BergyWater', 'Ice Concentration - Bergy Water', ICE, 46, '110201', 'Point3', ['black'], {glyph: g(WATER_LINES, line('M13 17L18 8L23 17Z'))}),
    metocSpec('WaterWithRadarTargets', 'Ice Concentration - Water with Radar Targets', ICE, 46, '110202', 'Point3', ['black'], {
        glyph: g(WATER_LINES, {circle: [18, 12, 4.5], width: 1.4}, line('M14.8 8.8L21.2 15.2M21.2 8.8L14.8 15.2', 1.4)),
    }),
    metocSpec('IceFree', 'Ice Concentration - Ice Free', ICE, 46, '110203', 'Point3', ['black'], {glyph: g(line('M5 9H14M9 12H19M5 15H14', 1.4))}),
    metocSpec('IceConvergence', 'Dynamic Processes - Convergence', ICE, 46, '110301', 'Point3', ['black'], {glyph: g(line('M2 12H9', 2.4), head(12, 12), line('M22 12H15', 2.4), head(12, 12, -1))}),
    metocSpec('IceDivergence', 'Dynamic Processes - Divergence', ICE, 46, '110302', 'Point3', ['black'], {glyph: g(line('M11 12H5', 2.4), head(2, 12, -1), line('M13 12H19', 2.4), head(22, 12))}),
    metocSpec('IceShearing', 'Dynamic Processes - Shearing or Shear Zone', ICE, 46, '110303', 'Point3', ['black'], {
        glyph: g(line('M5 9H16', 2.4), head(20, 9), line('M19 15H8', 2.4), head(4, 15, -1)),
    }),
    metocSpec('IceDrift', 'Dynamic Processes - Ice Drift (Direction)', ICE, 46, '110304', 'Point3', ['black'], {
        glyph: g(line('M3 12H16', 2.4), head(21, 12)),
        note: 'Drawn pointing east; the standard gives no direction field for it.',
    }),
    metocSpec('SeaIce', 'Sea Ice', ICE, 46, '110400', 'Point3', ['black'], {glyph: g({circle: [12, 12, 2.6], fill: 'main'})}),
    metocSpec('IceThicknessObserved', 'Sea Ice - Ice Thickness (Observed)', ICE, 46, '110401', 'Point3', ['black'], {
        valueField: v('Thickness (cm)', '30'),
        glyph: g(line('M3 4H21V20H3Z'), {text: '$value', x: 12, y: 12.3, size: 8}),
    }),
    metocSpec('IceThicknessEstimated', 'Sea Ice - Ice Thickness (Estimated)', ICE, 46, '110402', 'Point3', ['black'], {
        valueField: v('Thickness (cm)', '30'),
        glyph: g({d: 'M3 4H21V20H3Z', width: 1.6, dash: [2, 1.5]}, {text: '$value', x: 12, y: 12.3, size: 8}),
    }),
    metocSpec('MeltPuddles', 'Sea Ice - Melt Puddles or Flooded Ice', ICE, 46, '110403', 'Point3', ['black'], {glyph: g(line('M2.5 9H21.5'), line('M6.5 9A5.5 5.5 0 0 0 17.5 9'))}),
    metocSpec('SnowCover', 'Snow Cover', ICE, 46, '110700', 'Point3', ['black'], {glyph: g(line('M15.5 2.5C6.5 4.5 6.5 19.5 15.5 21.5C11.5 17 11.5 7 15.5 2.5Z'))}),
    metocSpec('Sastrugi', 'Snow Cover - Sastrugi (with Orientation)', ICE, 46, '110701', 'Point3', ['black'], {
        glyph: g(line('M4 21C4.5 12.5 19.5 12.5 20 21C17 17.5 7 17.5 4 21Z'), line('M12 14V3', 1.4), solid('M12 2L14 5.5H10Z')),
    }),
    metocSpec('RidgesHummocks', 'Topographical Features - Ridges or Hummocks', ICE, 46, '110801', 'Point3', ['black'], {
        glyph: g(solid('M3 17L7.5 8.5L12 17ZM12 17L16.5 8.5L21 17Z'), line('M3 20H21')),
    }),
    metocSpec('Rafting', 'Topographical Features - Rafting', ICE, 46, '110802', 'Point3', ['black'], {glyph: g(line('M2 19H7V6H11V19H14V6H18V19H22'))}),
    metocSpec('JammedBrashBarrier', 'Topographical Features - Jammed Brash Barrier', ICE, 46, '110803', 'Point3', ['black'], {
        glyph: g(solid('M3.5 6H12L7.75 14ZM12 6H20.5L16.25 14Z'), line('M3.5 18H20.5')),
    }),

    // Hydrography: depth, ports and harbours (Point1).
    metocSpec('Soundings', 'Depth - Soundings', DEP, 46, '120101', 'Point3', ['gray'], {
        valueField: v('Depth', '63'),
        glyph: g({text: '$value', x: 12, y: 12.5, size: 13}),
        note: 'The standard sets the decimal as a subscript (6 over 3); the value is written as entered.',
    }),
    metocSpec('BerthsOnshore', 'Ports - Berths (Onshore)', POR, 46, '120302', 'Point1', ['magenta'], {glyph: g({circle: [12, 12, 6], width: 1.8})}),
    metocSpec('BerthsAnchor', 'Ports - Berths (Anchor)', POR, 46, '120303', 'Point1', ['magenta'], {glyph: g(ANCHOR, {circle: [12, 12, 2.6], fill: 'halo', stroke: 'main', width: 1.4})}),
    metocSpec('AnchoragePoint', 'Ports - Anchorage - Point', POR, 46, '120304', 'Point1', ['magenta'], {glyph: g(ANCHOR)}),
    metocSpec('CallInPoint', 'Ports - Call In Point', POR, 46, '120307', 'Point1', ['magenta'], {glyph: g(line('M12 1.5L16 12L12 22.5L8 12Z', 1.4), {circle: [12, 12, 4], width: 1.4})}),
    metocSpec('FishingHarbor', 'Ports and Harbors - Fishing Harbor - Point', POR, 46, '120309', 'Point1', ['magenta'], {
        glyph: g(line('M6 12C9.5 6.5 16.5 6.5 20.5 12C16.5 17.5 9.5 17.5 6 12ZM6 12L2.5 8.5V15.5Z', 1.4), line('M16.5 9.5Q19 12 16.5 14.5', 1.2), line('M5 5.5Q12 1.5 19 5.5M5 18.5Q12 22.5 19 18.5', 1.4)),
    }),
    metocSpec('FishWeirs', 'Ports and Harbors - Fish Weirs - Point', POR, 46, '120310', 'Point1', ['gray'], {
        glyph: g(line('M3 3H21V21H3ZM3 9H21M8 3V21M16 3V21', 1.2), line('M7 14C10 10 15 10 18 14C15 18 10 18 7 14ZM7 14L5 12V16Z', 1.2)),
    }),
    metocSpec('FishStakes', 'Ports and Harbors - Fish Stakes - Point', POR, 46, '120311', 'Point1', ['gray'], {glyph: g(line('M6 4V18M9 20H20', 1.6))}),
    metocSpec('LandingPlace', 'Facilities - Landing Place', POR, 46, '120315', 'Point1', ['magenta'], {
        glyph: g({circle: [12, 12, 9.5], width: 1.6}, line('M12.5 3.5V17M12.5 4.5L19.5 15L12.5 16M3.5 17H20.5', 1.4), line('M12 6Q5 10 5 16H12', 1.4)),
    }),
    metocSpec('OffshoreLoadingPoint', 'Facilities - Offshore Loading Facility - Point', POR, 46, '120316', 'Point1', ['black'], {
        glyph: g({circle: [12, 4, 2.4], width: 1.4}, line('M8 7.5H16L19 20H5Z', 1.4), line('M2.5 20H21.5', 1.4), {circle: [12, 20, 1.8], fill: 'halo', stroke: 'main', width: 1.2}),
    }),
    metocSpec('LandingRing', 'Facilities - Landing Ring', POR, 46, '120321', 'Point1', [DARK_BROWN], {glyph: g({d: 'M4 6.5H20V17.5H4Z', fill: 'main', stroke: 'black', width: 1.2})}),
    metocSpec('FerryCrossing', 'Facilities - Ferry Crossing', POR, 46, '120322', 'Point1', ['magenta'], {
        glyph: g({d: 'M0.5 12H11', width: 1.6, dash: [2, 1.6]}, line('M12 9H20L23 12L20 15H12Z', 1.4)),
    }),
    metocSpec('CableFerryCrossing', 'Facilities - Cable Ferry Crossing', POR, 46, '120323', 'Point1', ['black'], {
        glyph: g({d: 'M0.5 12H11', width: 1.6, dash: [2, 1.6]}, line('M12 9H20L23 12L20 15H12Z', 1.4)),
    }),
    metocSpec('Dolphin', 'Facilities - Dolphin', POR, 46, '120324', 'Point1', [DARK_BROWN], {glyph: g({d: 'M4 6.5H20V17.5H4Z', fill: 'main', stroke: 'black', width: 1.2})}),

    // Aids to navigation (Point1).
    metocSpec('Beacon', 'Aids to Navigation - Beacon', NAV, 46, '120401', 'Point1', ['black'], {
        glyph: g(line('M12 3V17', 3.4), line('M3 19H21', 1.8), {d: 'M9.5 18.5A2.5 1.3 0 1 0 14.5 18.5A2.5 1.3 0 1 0 9.5 18.5Z', fill: 'halo', stroke: 'main', width: 1.2}),
    }),
    metocSpec('BuoyDefault', 'Aids to Navigation - Buoy Default', NAV, 46, '120402', 'Point1', ['black'], {
        glyph: g({circle: [10, 9, 6], width: 1.2}, line('M2 17H18', 1.4), {circle: [10, 17, 1.8], fill: 'halo', stroke: 'main', width: 1.2}, {text: '?', x: 20, y: 7, size: 8, color: 'magenta'}),
    }),
    metocSpec('Marker', 'Aids to Navigation - Marker', NAV, 46, '120403', 'Point1', ['magenta'], {
        glyph: g(line('M7 2.5H17V11H7Z', 1.4), line('M12 11V15M6.5 17H17.5', 1.4), {circle: [12, 17, 2], fill: 'halo', stroke: 'main', width: 1.4}),
    }),
    metocSpec('PerchesStakesPoint', 'Aids to Navigation - Perches/Stakes - Point', NAV, 46, '120404', 'Point1', ['black'], {glyph: g({circle: [12, 12, 5], fill: 'main'})}),
    metocSpec('NavigationLight', 'Aids to Navigation - Light', NAV, 46, '120406', 'Point1', ['magenta'], {glyph: g(solid('M4 3L20 15A3.6 3.6 0 1 1 14.8 19.6Z'))}),
    metocSpec('LightVessel', 'Aids to Navigation - Light Vessel/Light Ship', NAV, 46, '120408', 'Point1', ['black'], {
        glyph: g(
            line('M2 12Q4 17 6 17H18Q20 17 22 12M5 14H19M2 18.5H22', 1.4),
            line('M8 14V7M12 14V3.5M16 14V7M10.5 4.5H13.5', 1.4),
            {circle: [12, 18.5, 1.8], fill: 'halo', stroke: 'main', width: 1.2},
        ),
    }),
    metocSpec('Lighthouse', 'Aids to Navigation - Lighthouse', NAV, 46, '120409', 'Point1', ['black'], {
        glyph: g(line('M10 9.5L8 21M14 9.5L16 21M4 21H20M10.5 14H13.5', 1.4), {circle: [12, 7.5, 2.2], width: 1.4}, line('M12 4V1.5M8.5 5.5L6.5 3.5M15.5 5.5L17.5 3.5M7.5 8H5M16.5 8H19', 1.2)),
    }),

    // Dangers and hazards (Point1).
    metocSpec('RockSubmerged', 'Dangers/Hazards - Rock Submerged', HAZ, 46, '120501', 'Point1', ['black'], {
        glyph: g(dotted('M3.5 12A8.5 8.5 0 1 0 20.5 12A8.5 8.5 0 1 0 3.5 12Z', WATER_BLUE), line('M12 4V20M4 12H20', 1.4)),
    }),
    metocSpec('RockAwashed', 'Dangers/Hazards - Rock Awashed', HAZ, 46, '120502', 'Point1', ['black'], {glyph: g(line('M7 3.5L17 20.5M17 3.5L7 20.5M3.5 12H20.5', 1.4))}),
    metocSpec('FoulGroundPoint', 'Dangers/Hazards - Foul Ground - Point', HAZ, 46, '120504', 'Point1', ['gray'], {glyph: g(line('M9.5 4L8.5 20M15.5 4L14.5 20M5 9H19.5M4.5 15H19', 1.4))}),
    metocSpec('KelpPoint', 'Dangers/Hazards - Kelp/Seaweed - Point', HAZ, 46, '120506', 'Point1', ['gray'], {
        glyph: g(line('M2 12.5C8 11.5 14 13.5 22 11M6 12.2L3 9M6 12.2L4 15.5M12.5 12.6L9.5 8.5M16.5 12.2L19.5 9', 1.4)),
    }),
    metocSpec('SnagsStumps', 'Dangers/Hazards - Snags/Stumps', HAZ, 46, '120508', 'Point1', ['black'], {
        glyph: g(dotted('M2 12A10 6.5 0 1 0 22 12A10 6.5 0 1 0 2 12Z', WATER_BLUE)),
    }),
    metocSpec('WreckUncovers', 'Dangers/Hazards - Wreck (Uncovers)', HAZ, 46, '120509', 'Point1', ['gray'], {
        glyph: g(solid('M3.5 9L16.5 17.5H10.5Z'), line('M3 17.5H21M15 16L18.5 6', 1.4), {circle: [12.5, 18, 1.6], fill: 'main'}),
    }),
    metocSpec('WreckSubmerged', 'Dangers/Hazards - Wreck (Submerged)', HAZ, 46, '120510', 'Point1', ['black'], {
        glyph: g(dotted('M2 12A10 6.5 0 1 0 22 12A10 6.5 0 1 0 2 12Z', WATER_BLUE), line('M4 12H20M8 8.5V15.5M12 8.5V15.5M16 8.5V15.5', 1.4)),
    }),
    metocSpec('EddiesOverfalls', 'Dangers/Hazards - Eddies/Overfalls/Tide Rips', HAZ, 46, '120513', 'Point1', ['gray'], {
        glyph: g(line('M2 17C3 8 8 7 8 12C8 16 5 15 7 11C9 7 13 7 13 12C13 16 10 15 12 11C14 7 18 7 18 12C18 16 15 15 17 11C18 9 21 8 22 9.5', 1.3)),
    }),

    // Bottom characteristics and qualifying terms (Point3): the chart abbreviations.
    metocSpec('BottomSand', 'Bottom Characteristics - Sand', BOT, 46, '120601', 'Point3', ['black'], {glyph: abbrev('S')}),
    metocSpec('BottomMud', 'Bottom Characteristics - Mud', BOT, 46, '120602', 'Point3', ['black'], {glyph: abbrev('M')}),
    metocSpec('BottomClay', 'Bottom Characteristics - Clay', BOT, 46, '120603', 'Point3', ['black'], {glyph: abbrev('Cy')}),
    metocSpec('BottomSilt', 'Bottom Characteristics - Silt', BOT, 46, '120604', 'Point3', ['black'], {glyph: abbrev('Si')}),
    metocSpec('BottomStones', 'Bottom Characteristics - Stones', BOT, 46, '120605', 'Point3', ['black'], {glyph: abbrev('St')}),
    metocSpec('BottomGravel', 'Bottom Characteristics - Gravel', BOT, 46, '120606', 'Point3', ['black'], {glyph: abbrev('G')}),
    metocSpec('BottomPebbles', 'Bottom Characteristics - Pebbles', BOT, 46, '120607', 'Point3', ['black'], {glyph: abbrev('P')}),
    metocSpec('BottomCobbles', 'Bottom Characteristics - Cobbles', BOT, 46, '120608', 'Point3', ['black'], {glyph: abbrev('Cb')}),
    metocSpec('BottomRock', 'Bottom Characteristics - Rock', BOT, 46, '120609', 'Point3', ['black'], {glyph: abbrev('R')}),
    metocSpec('BottomCoral', 'Bottom Characteristics - Coral', BOT, 46, '120610', 'Point3', ['black'], {glyph: abbrev('Co')}),
    metocSpec('BottomShell', 'Bottom Characteristics - Shell', BOT, 46, '120611', 'Point3', ['black'], {glyph: abbrev('Sh')}),
    metocSpec('QualifyingFine', 'Qualifying Terms - Fine', BOT, 46, '120612', 'Point3', ['black'], {glyph: abbrev('f')}),
    metocSpec('QualifyingMedium', 'Qualifying Terms - Medium', BOT, 46, '120613', 'Point3', ['black'], {glyph: abbrev('m')}),
    metocSpec('QualifyingCoarse', 'Qualifying Terms - Coarse', BOT, 46, '120614', 'Point3', ['black'], {glyph: abbrev('c')}),

    // Tide and current (Point1).
    metocSpec('WaterTurbulence', 'Tide and Current - Water Turbulence', TID, 46, '120701', 'Point1', ['gray'], {
        glyph: g(line('M2 17C3 8 8 7 8 12C8 16 5 15 7 11C9 7 13 7 13 12C13 16 10 15 12 11C14 7 18 7 18 12C18 16 15 15 17 11C18 9 21 8 22 9.5', 1.3)),
    }),
    metocSpec('TideDataPoint', 'Tide and Current - Tide Data Point', TID, 46, '120704', 'Point1', ['gray'], {glyph: g(line('M12 2.5L20 12L12 21.5L4 12Z', 1.6))}),
    metocSpec('TideGauge', 'Tide and Current - Tide Gauge', TID, 46, '120705', 'Point1', ['magenta'], {
        glyph: g({d: 'M1.5 7H22.5V17H1.5Z', stroke: 'brown', width: 1.4}, {text: 'SS', x: 12, y: 12.3, size: 9}),
    }),

    // Man-made structures (Point1).
    metocSpec('Ford', 'Man-Made Structures - Ford', MAN, 46, '160400', 'Point1', ['black'], {glyph: g(solid('M7 3H17L12 11ZM7 21H17L12 13Z'))}),
    metocSpec('Lock', 'Man-Made Structures - Lock', MAN, 46, '160500', 'Point1', ['black'], {glyph: g(line('M6 6L18 12L6 18', 1.8))}),
    metocSpec('OilGasRig', 'Man-Made Structures - Oil/Gas Rig', MAN, 46, '160600', 'Point1', ['black'], {
        glyph: g(line('M7.5 21.5L10 3H14L16.5 21.5M9.2 9H14.8M8.5 15H15.5M10 3L15.3 15M14 3L8.7 15M9.2 9L16 21.5M14.8 9L8 21.5', 1.2)),
    }),
    metocSpec('PilePost', 'Man-Made Structures - Pile/Piling/Post', MAN, 46, '160900', 'Point1', ['black'], {glyph: g({circle: [12, 12, 4], fill: 'main'})}),
] as const;

export {DEEP_BLUE, WATER_BLUE};
