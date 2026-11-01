/**
 * Symbol set 45 point symbols drawn from their Table M-II icons: pressure tendency, turbulence,
 * icing, cloud cover, present weather, storms and tropical systems, volcanic symbols, levels, and
 * the state of the ground. Each icon is authored in a 24-unit box from the standard's drawing,
 * from a handful of primitives (rain dot, drizzle comma, snow star, shower triangle) so the
 * families stay consistent with each other.
 */

import {MetocCategory, metocSpec, type GlyphDef, type GlyphPart} from '../core/specTypes.js';

const PT = MetocCategory.PressureTendency;
const TI = MetocCategory.TurbulenceIcing;
const CC = MetocCategory.CloudCover;
const WX = MetocCategory.Weather;
const ST = MetocCategory.StormsTropical;
const SG = MetocCategory.StateOfGround;

const g = (...parts: (GlyphPart | GlyphPart[])[]): GlyphDef => ({parts: parts.flat()});
const line = (d: string, width = 1.6): GlyphPart => ({d, width});

// ── primitives ─────────────────────────────────────────────────────────────────

const dot = (x: number, y: number, r = 2.2): GlyphPart => ({circle: [x, y, r], fill: 'main'});
const comma = (x: number, y: number): GlyphPart[] => [
    {circle: [x, y, 1.9], fill: 'main'},
    {d: `M${x + 1.8} ${y - 0.2} Q${x + 2} ${y + 3.2} ${x - 1.2} ${y + 4.4}`, width: 1.5},
];
/** The snow star: a horizontal stroke crossed by two at ±60°, six arms of equal length. */
const star = (x: number, y: number, r = 2.9): GlyphPart => ({
    d: `M${x - r} ${y}H${x + r}M${x - r / 2} ${y - r * 0.866}L${x + r / 2} ${y + r * 0.866}M${x - r / 2} ${y + r * 0.866}L${x + r / 2} ${y - r * 0.866}`,
    width: 1.3,
});
/** The shower triangle, point down, its top edge at `top`; with a bar, moderate or heavy. */
const shower = (top: number, h = 10, bar = false): GlyphPart[] => [
    line(`M${12 - h * 0.42} ${top}H${12 + h * 0.42}L12 ${top + h}Z`, 1.4),
    ...(bar ? [line(`M${12 - h * 0.33} ${top + h * 0.22}H${12 + h * 0.33}`, 1.4)] : []),
];
/** The four intensity layouts of rain, drizzle and snow, as mark centres. */
const LAYOUT = {
    intermittentLight: [[12, 12]],
    continuousLight: [
        [7.5, 12],
        [16.5, 12],
    ],
    intermittentModerate: [
        [12, 7.5],
        [12, 16.5],
    ],
    continuousModerate: [
        [12, 7],
        [7.5, 15.5],
        [16.5, 15.5],
    ],
    intermittentHeavy: [
        [12, 4],
        [12, 12],
        [12, 20],
    ],
    continuousHeavy: [
        [12, 4.5],
        [6, 12],
        [18, 12],
        [12, 19.5],
    ],
} as const;
type Layout = keyof typeof LAYOUT;
const marks = (layout: Layout, mark: (x: number, y: number) => GlyphPart | GlyphPart[]) => g(...LAYOUT[layout].map(([x, y]) => mark(x, y)));
/** The freezing wave around a mark, for freezing rain and drizzle. */
/** The freezing wave, as Table M-II draws it: open at the lower left, over the first mark, down
 *  through the middle and under the second; turned half a turn about the centre, it is itself. */
const FREEZE = line('M3.8 15.5C1.2 12.5 2.6 7.1 6.8 7.1C9.6 7.1 10.8 9.6 12 12C13.2 14.4 14.4 16.9 17.2 16.9C21.4 16.9 22.8 11.5 20.2 8.5', 1.4);
/**
 * The thunderstorm bolt: a stem, a top bar, a zigzag down to an arrowhead. Light to moderate: one
 * turn, the last leg down to the right. Heavy: two turns, the last leg down to the left.
 */
const bolt = (top = 7, heavy = false): GlyphPart[] =>
    heavy
        ? [line(`M8 ${top}V22M8 ${top}H17L13 ${top + 4.7}L17 ${top + 9.1}L13 22`, 1.4), line('M15.9 21L13 22L13.3 19.3', 1.4)]
        : [line(`M8 ${top}V22M8 ${top}H15L11 ${top + 7}L16 21`, 1.4), line('M13.4 20.6L16 21L16.4 18.2', 1.4)];
/**
 * The dust devil's coil: a helix seen from the side, three turns open to the left with two small
 * loops on the right, both ends open at the right.
 */
const COIL = ((): string => {
    const pts: string[] = [];
    const t0 = Math.PI + 0.35;
    const t1 = 7 * Math.PI - 0.35;
    for (let i = 0; i <= 96; i++) {
        const t = t0 + ((t1 - t0) * i) / 96;
        const x = 12 - 4.75 * Math.cos(t);
        const y = 0.6 + 1.0 * (t - Math.PI) + 3.3 * Math.sin(t);
        pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return `M${pts.join('L')}`;
})();
const BOX = line('M5 5H19V19H5Z', 1.6);
const OPEN_TOP = line('M5 4V19H19V4', 1.6);
const L_SHAPE = line('M5 4V19H19', 1.6);
const DIAGONAL = line('M5 19L19 5', 1.4);
/**
 * The bold asterisk of the snow-cover boxes: five arms, one straight up, as the drawings set it.
 * Drawn rather than set in type so it sits where the box puts it.
 */
const asterisk = (x = 12, y = 11.5, r = 2.9): GlyphPart => ({
    d: [0, 72, 144, 216, 288]
        .map((deg) => {
            const a = (deg * Math.PI) / 180;
            return `M${x} ${y}L${(x + r * Math.sin(a)).toFixed(2)} ${(y - r * Math.cos(a)).toFixed(2)}`;
        })
        .join(''),
    width: 2,
});
const downArrow = (x: number, top: number): GlyphPart[] => [line(`M${x} ${top}V17`, 1.2), line(`M${x - 1.6} 15.6L${x} 17.4L${x + 1.6} 15.6`, 1.2)];
const RIGHT_ARROW = [line('M9.2 16.8H17.4', 1.2), line('M15.6 15.2L17.6 16.8L15.6 18.4', 1.2)];
const CIRCLE = {circle: [12, 12, 9] as const, width: 1.4};

// ── entries ────────────────────────────────────────────────────────────────────

const v = (label: string, placeholder: string) => ({label, placeholder});
/** The flight level a turbulence or icing symbol is at: three digits, hundreds of feet. */
const HEIGHT = v('Height (hundreds of ft)', '250');
const HEIGHT_BELOW: GlyphPart = {text: '$value', x: 12, y: 24.5, size: 6.5};
const HEIGHT_NOTE = 'Table M-II puts the height "within the graphic" but draws no place for it; it is written under the symbol, inside its box, where no stroke crosses it.';

export const SET45_POINT_SPECS = [
    // Pressure tendency (Point2). Table M-II prints rising tendencies "Black/Blue" and falling ones
    // "Black/Red", and draws them blue and red: blue or red by default, black where the operator
    // chooses it. Steady is black.
    metocSpec('PressureRiseThenFallHigher', 'Pressure Tendency - Rise Then Fall Higher', PT, 45, '110501', 'Point2', ['cold'], {operatorColor: ['cold', 'black'], glyph: g(line('M6 21L15 4L20 8', 1.8))}),
    metocSpec('PressureRiseThenSteady', 'Pressure Tendency - Rise Then Steady', PT, 45, '110502', 'Point2', ['cold'], {operatorColor: ['cold', 'black'], glyph: g(line('M5 21L13.5 5H21', 1.8))}),
    metocSpec('PressureRise', 'Pressure Tendency - Rise', PT, 45, '110503', 'Point2', ['cold'], {operatorColor: ['cold', 'black'], glyph: g(line('M8 21L16 4', 1.8))}),
    metocSpec('PressureRiseThenRiseHigher', 'Pressure Tendency - Rise Then Rise Higher', PT, 45, '110504', 'Point2', ['cold'], {operatorColor: ['cold', 'black'], glyph: g(line('M4 16L8.5 19.5L19 3', 1.8))}),
    metocSpec('PressureSteady', 'Pressure Tendency - Steady', PT, 45, '110505', 'Point2', ['black'], {glyph: g(line('M3 12H21', 1.8))}),
    metocSpec('PressureFallThenRiseLower', 'Pressure Tendency - Fall Then Rise Lower', PT, 45, '110506', 'Point2', ['warm'], {operatorColor: ['warm', 'black'], glyph: g(line('M6 4L15 20L20 16.5', 1.8))}),
    metocSpec('PressureFallThenSteady', 'Pressure Tendency - Fall Then Steady', PT, 45, '110507', 'Point2', ['warm'], {operatorColor: ['warm', 'black'], glyph: g(line('M5 4L13.5 19H21', 1.8))}),
    metocSpec('PressureFall', 'Pressure Tendency - Fall', PT, 45, '110508', 'Point2', ['warm'], {operatorColor: ['warm', 'black'], glyph: g(line('M8 4L16 20', 1.8))}),
    metocSpec('PressureRiseThenFallLower', 'Pressure Tendency - Rise Then Fall Lower', PT, 45, '110509', 'Point2', ['warm'], {operatorColor: ['warm', 'black'], glyph: g(line('M4 8L8.5 4.5L19 21', 1.8))}),

    // Turbulence (Point3): a caret, footed for moderate, with more carets above for worse.
    // Turbulence and icing (Point3) carry "the height (X in 3 digits) above mean sea level in
    // hundreds of feet (or meters) ... within the graphic". The drawings show no place for it; it is
    // written under the symbol, inside its box, where no stroke crosses it, and inside the ellipse
    // of mountain waves, which has room.
    metocSpec('TurbulenceLight', 'Turbulence - Light', TI, 45, '120100', 'Point3', ['cold'], {glyph: g(line('M3 17L12 8L21 17', 1.3), HEIGHT_BELOW), valueField: HEIGHT, note: HEIGHT_NOTE}),
    metocSpec('TurbulenceModerate', 'Turbulence - Moderate', TI, 45, '120200', 'Point3', ['cold'], {glyph: g(line('M1 17H4L12 9L20 17H23', 1.3), HEIGHT_BELOW), valueField: HEIGHT, note: HEIGHT_NOTE}),
    metocSpec('TurbulenceSevere', 'Turbulence - Severe', TI, 45, '120300', 'Point3', ['cold'], {
        glyph: g(line('M1 18H4L12 10L20 18H23', 1.3), line('M8.1 12.8L12 8.9L15.9 12.8', 1.3), HEIGHT_BELOW),
        valueField: HEIGHT,
        note: HEIGHT_NOTE,
    }),
    metocSpec('TurbulenceExtreme', 'Turbulence - Extreme', TI, 45, '120400', 'Point3', ['cold'], {
        glyph: g(line('M1 18H4L12 10L20 18H23', 1.3), line('M8.1 12.8L12 8.9L15.9 12.8', 1.3), line('M8.1 11.7L12 7.8L15.9 11.7', 1.3), HEIGHT_BELOW),
        valueField: HEIGHT,
        note: HEIGHT_NOTE,
    }),
    metocSpec('TurbulenceMountainWaves', 'Turbulence - Mountain Waves', TI, 45, '120500', 'Point3', ['cold'], {
        glyph: g(line('M2 12A10 5.3 0 1 0 22 12A10 5.3 0 1 0 2 12Z', 1.8), {text: '$value', x: 12, y: 12.3, size: 6.5}),
        valueField: HEIGHT,
        note: 'The height is written inside the ellipse.',
    }),

    // Icing (Point3): clear is a dome, rime a bowl, mixed both; bars for light, moderate, severe.
    // The bars reach a little past the shape at both ends, as the drawings show; mixed icing's
    // light bars run from the line outward, its moderate and severe bars across both halves.
    ...(['Light', 'Moderate', 'Severe'] as const).flatMap((level, i) => {
        const bars = (cx: number, from: number, to: number, gap: number) =>
            [[0], [-0.5, 0.5], [-1, 0, 1]][i].map((k) => line(`M${cx + k * gap} ${from}V${to}`, 1.4));
        const codes = ['01', '02', '03'][i];
        const mixedBars = [
            [...bars(7.25, 12, 19.7, 2), ...bars(16.75, 4.3, 12.1, 2)],
            [...bars(7.25, 7.6, 18, 2), ...bars(16.75, 6.1, 16.4, 2)],
            [...bars(7.25, 7.5, 17.8, 2), ...bars(16.75, 6.1, 16.4, 2)],
        ][i];
        return [
            metocSpec(`IcingClear${level}`, `Clear Icing - ${level}`, TI, 45, `1301${codes}`, 'Point3', ['icingBrown'], {
                glyph: g(line('M3.5 16A8.5 7.4 0 0 1 20.5 16', 1.6), bars(12, 7.6, 17.1, 1.9), HEIGHT_BELOW),
                valueField: HEIGHT,
                note: HEIGHT_NOTE,
            }),
            metocSpec(`IcingRime${level}`, `Rime Icing - ${level}`, TI, 45, `1302${codes}`, 'Point3', ['icingBrown'], {
                glyph: g(line('M3.5 8A8.5 7.4 0 0 0 20.5 8', 1.6), bars(12, 6.9, 16.4, 1.9), HEIGHT_BELOW),
                valueField: HEIGHT,
                note: HEIGHT_NOTE,
            }),
            metocSpec(`IcingMixed${level}`, `Mixed Icing - ${level}`, TI, 45, `1303${codes}`, 'Point3', ['icingBrown'], {
                glyph: g(line('M2.5 12A4.75 4.6 0 0 0 12 12A4.75 4.6 0 0 1 21.5 12', 1.6), mixedBars, HEIGHT_BELOW),
                valueField: HEIGHT,
                note: HEIGHT_NOTE,
            }),
        ] as const;
    }),

    // Cloud cover (Point6): the station circle filled by the share of sky covered.
    metocSpec('CloudClearSky', 'Cloud Coverage - Clear Sky', CC, 45, '150101', 'Point6', ['black'], {glyph: g(CIRCLE)}),
    metocSpec('CloudFew', 'Cloud Coverage - Few Coverage', CC, 45, '150102', 'Point6', ['black'], {glyph: g(CIRCLE, {d: 'M12 12V3A9 9 0 0 1 21 12Z', fill: 'main'})}),
    metocSpec('CloudScattered', 'Cloud Coverage - Scattered Coverage', CC, 45, '150103', 'Point6', ['black'], {
        glyph: g(CIRCLE, {d: 'M12 12V3A9 9 0 0 1 21 12Z', fill: 'main'}, line('M12 12V21M12 12H21', 1.4)),
    }),
    metocSpec('CloudBroken', 'Cloud Coverage - Broken Coverage', CC, 45, '150104', 'Point6', ['black'], {glyph: g(CIRCLE, {d: 'M12 12H3A9 9 0 1 0 12 3Z', fill: 'main'})}),
    metocSpec('CloudOvercast', 'Cloud Coverage - Overcast Coverage', CC, 45, '150105', 'Point6', ['black'], {glyph: g({circle: [12, 12, 9], fill: 'main'})}),
    metocSpec('CloudSkyObscured', 'Cloud Coverage - Sky Totally or Partially Obscured', CC, 45, '150106', 'Point6', ['black'], {
        glyph: g(CIRCLE, line('M5.6 5.6L18.4 18.4M18.4 5.6L5.6 18.4', 1.4)),
    }),

    // Rain, drizzle, snow (Point7): one, two, three or four marks for the intensity.
    metocSpec('RainIntermittentLight', 'Rain - Intermittent Light', WX, 45, '160101', 'Point7', ['green'], {glyph: marks('intermittentLight', dot)}),
    metocSpec('RainContinuousLight', 'Rain - Continuous Light', WX, 45, '160102', 'Point7', ['green'], {glyph: marks('continuousLight', dot)}),
    metocSpec('RainIntermittentModerate', 'Rain - Intermittent Moderate', WX, 45, '160103', 'Point7', ['green'], {glyph: marks('intermittentModerate', dot)}),
    metocSpec('RainContinuousModerate', 'Rain - Intermittent Moderate/Continuous Moderate', WX, 45, '160104', 'Point7', ['green'], {glyph: marks('continuousModerate', dot)}),
    metocSpec('RainIntermittentHeavy', 'Rain - Intermittent Heavy', WX, 45, '160105', 'Point7', ['green'], {glyph: marks('intermittentHeavy', dot)}),
    metocSpec('RainContinuousHeavy', 'Rain - Intermittent Heavy/Continuous Heavy', WX, 45, '160106', 'Point7', ['green'], {glyph: marks('continuousHeavy', dot)}),
    metocSpec('FreezingRainLight', 'Freezing Rain - Light', WX, 45, '160201', 'Point7', ['warm'], {glyph: g(FREEZE, dot(6.9, 12, 2.6))}),
    metocSpec('FreezingRainModerateHeavy', 'Freezing Rain - Moderate/Heavy', WX, 45, '160202', 'Point7', ['warm'], {glyph: g(FREEZE, dot(6.9, 12, 2.6), dot(17.2, 12, 2.6))}),
    metocSpec('RainShowersLight', 'Rain Showers - Light', WX, 45, '160301', 'Point7', ['green'], {glyph: g(dot(12, 5), shower(9, 12))}),
    metocSpec('RainShowersModerateHeavy', 'Rain Showers - Moderate/Heavy', WX, 45, '160302', 'Point7', ['green'], {glyph: g(dot(12, 5), shower(9, 12, true))}),
    metocSpec('RainShowersTorrential', 'Rain Showers - Torrential', WX, 45, '160303', 'Point7', ['green'], {glyph: g(dot(12, 3, 2), dot(12, 8, 2), shower(11.5, 11))}),
    metocSpec('DrizzleIntermittentLight', 'Drizzle - Intermittent Light', WX, 45, '160401', 'Point7', ['green'], {glyph: marks('intermittentLight', comma)}),
    metocSpec('DrizzleContinuousLight', 'Drizzle - Intermittent Light/Continuous Light', WX, 45, '160402', 'Point7', ['green'], {glyph: marks('continuousLight', comma)}),
    metocSpec('DrizzleIntermittentModerate', 'Drizzle - Intermittent Moderate', WX, 45, '160403', 'Point7', ['green'], {glyph: marks('intermittentModerate', comma)}),
    metocSpec('DrizzleContinuousModerate', 'Drizzle - Intermittent Moderate/Continuous Moderate', WX, 45, '160404', 'Point7', ['green'], {glyph: marks('continuousModerate', comma)}),
    metocSpec('DrizzleIntermittentHeavy', 'Drizzle - Intermittent Heavy', WX, 45, '160405', 'Point7', ['green'], {glyph: marks('intermittentHeavy', comma)}),
    metocSpec('DrizzleContinuousHeavy', 'Drizzle - Intermittent Heavy/Continuous Heavy', WX, 45, '160406', 'Point7', ['green'], {glyph: marks('continuousHeavy', comma)}),
    metocSpec('FreezingDrizzleLight', 'Freezing Drizzle - Light', WX, 45, '160501', 'Point7', ['warm'], {glyph: g(FREEZE, comma(6.6, 10.8))}),
    metocSpec('FreezingDrizzleModerateHeavy', 'Freezing Drizzle - Moderate/Heavy', WX, 45, '160502', 'Point7', ['warm'], {glyph: g(FREEZE, comma(6.6, 10.8), comma(16.9, 10.8))}),
    metocSpec('RainOrDrizzleAndSnowLight', 'Rain or Drizzle and Snow - Light', WX, 45, '160601', 'Point7', ['green'], {glyph: g(dot(12, 7), star(12, 16))}),
    metocSpec('RainOrDrizzleAndSnowModerateHeavy', 'Rain or Drizzle and Snow - Moderate/Heavy', WX, 45, '160602', 'Point7', ['green'], {
        glyph: g(star(12, 4.5), dot(12, 12), star(12, 19.5)),
    }),
    metocSpec('RainAndSnowShowersLight', 'Rain and Snow Showers - Light', WX, 45, '160603', 'Point7', ['green'], {glyph: g(dot(12, 2.8, 2), star(12, 8.5, 2.6), shower(13, 10))}),
    metocSpec('RainAndSnowShowersModerateHeavy', 'Rain and Snow Showers - Moderate/Heavy', WX, 45, '160604', 'Point7', ['green'], {
        glyph: g(dot(12, 2.8, 2), star(12, 8.5, 2.6), shower(13, 10, true)),
    }),
    metocSpec('SnowIntermittentLight', 'Snow - Intermittent Light', WX, 45, '160701', 'Point7', ['green'], {glyph: marks('intermittentLight', star)}),
    metocSpec('SnowContinuousLight', 'Snow - Intermittent Light/Continuous Light', WX, 45, '160702', 'Point7', ['green'], {glyph: marks('continuousLight', star)}),
    metocSpec('SnowIntermittentModerate', 'Snow - Intermittent Moderate', WX, 45, '160703', 'Point7', ['green'], {glyph: marks('intermittentModerate', star)}),
    metocSpec('SnowContinuousModerate', 'Snow - Intermittent Moderate/Continuous Moderate', WX, 45, '160704', 'Point7', ['green'], {glyph: marks('continuousModerate', star)}),
    metocSpec('SnowIntermittentHeavy', 'Snow - Intermittent Heavy', WX, 45, '160705', 'Point7', ['green'], {glyph: marks('intermittentHeavy', star)}),
    metocSpec('SnowContinuousHeavy', 'Snow - Intermittent Heavy/Continuous Heavy', WX, 45, '160706', 'Point7', ['green'], {glyph: marks('continuousHeavy', star)}),
    metocSpec('BlowingSnowLightModerate', 'Blowing Snow - Light/Moderate', WX, 45, '160707', 'Point7', ['green'], {
        glyph: g(line('M12 22V3M8.5 6.5L12 3L15.5 6.5', 1.4), line('M3 14H21M17.5 10.5L21 14L17.5 17.5', 1.4)),
    }),
    metocSpec('BlowingSnowHeavy', 'Blowing Snow - Heavy', WX, 45, '160708', 'Point7', ['green'], {
        glyph: g(line('M12 22V3M8.5 6.5L12 3L15.5 6.5', 1.4), line('M3 12.5H20M3 15.5H20M17 9.5L21 14L17 18.5', 1.4)),
    }),
    metocSpec('SnowGrains', 'Snow Grains', WX, 45, '160800', 'Point7', ['green'], {glyph: g(line('M1 12H23', 1.4), line('M12 9L15 15H9Z', 1.4))}),
    metocSpec('SnowShowersLight', 'Snow Showers - Light', WX, 45, '160901', 'Point7', ['green'], {glyph: g(star(12, 5), shower(10, 12))}),
    metocSpec('SnowShowersModerateHeavy', 'Snow Showers - Moderate/Heavy', WX, 45, '160902', 'Point7', ['green'], {glyph: g(star(12, 5), shower(10, 12, true))}),
    metocSpec('HailLight', 'Hail - Light, Not Associated with Thunder', WX, 45, '161001', 'Point7', ['warm'], {
        glyph: g({d: 'M12 2.5L15.5 9H8.5Z', fill: 'main'}, shower(10.5, 11)),
    }),
    metocSpec('HailModerateHeavy', 'Hail - Moderate/Heavy, Not Associated with Thunder', WX, 45, '161002', 'Point7', ['warm'], {
        glyph: g({d: 'M12 2.5L15.5 9H8.5Z', fill: 'main'}, shower(10.5, 11, true)),
    }),
    metocSpec('IceCrystals', 'Ice Crystals (Diamond Dust)', WX, 45, '161100', 'Point7', ['warm'], {glyph: g(line('M3 12H21M7 8.5L3 12L7 15.5M17 8.5L21 12L17 15.5', 1.4))}),
    ...(() => {
        const pellet = (x: number, y: number): GlyphPart[] => [line(`M${x} ${y - 4}L${x + 4} ${y + 3}H${x - 4}Z`, 1.3), dot(x, y + 0.8, 0.9)];
        const smallPellet = (x: number, apex: number, h = 6.4): GlyphPart[] => [line(`M${x} ${apex}L${x + h / 2} ${apex + h}H${x - h / 2}Z`, 1.3), dot(x, apex + h * 0.63, 0.8)];
        return [
            metocSpec('IcePelletsLight', 'Ice Pellets (Sleet) - Light', WX, 45, '161201', 'Point7', ['warm'], {glyph: g(pellet(12, 12))}),
            metocSpec('IcePelletsModerate', 'Ice Pellets (Sleet) - Moderate', WX, 45, '161202', 'Point7', ['warm'], {glyph: g(pellet(12, 7), pellet(7, 16), pellet(17, 16))}),
            // Four smaller pellets in a diamond, apart from each other, as drawn.
            metocSpec('IcePelletsHeavy', 'Ice Pellets (Sleet) - Heavy', WX, 45, '161203', 'Point7', ['warm'], {
                glyph: g(smallPellet(12, 1.5), smallPellet(8.1, 9), smallPellet(15.9, 9), smallPellet(12, 16.3)),
            }),
        ] as const;
    })(),
    metocSpec('Inversion', 'Inversion', WX, 45, '161300', 'Point7', ['black'], {
        glyph: g(line('M5 22V6', 3), line('M3.5 4.5H22', 3), line('M6.5 10Q9 6.5 11.5 9.5T16.5 9.5T21.5 9.5', 1.8)),
    }),

    // Storms (Point7).
    metocSpec('ThunderstormNoPrecipitation', 'Thunderstorm - No Precipitation', ST, 45, '161401', 'Point7', ['warm'], {
        glyph: g(bolt(5), line('M5 3Q1.5 12.5 5 22', 1.4), line('M19 3Q22.5 12.5 19 22', 1.4)),
    }),
    metocSpec('ThunderstormLightModerateRainSnow', 'Thunderstorm Light to Moderate with Rain/Snow - No Hail', ST, 45, '161402', 'Point7', ['warm'], {
        glyph: g(dot(8.5, 4, 2), line('M10.6 6.8L13 1.8', 1.2), star(15.8, 4.3, 2), bolt(8)),
    }),
    metocSpec('ThunderstormHeavyRainSnow', 'Thunderstorm Heavy with Rain/Snow - No Hail', ST, 45, '161403', 'Point7', ['warm'], {
        glyph: g(dot(8.5, 4, 2), line('M10.6 6.8L13 1.8', 1.2), star(15.8, 4.3, 2), bolt(8, true)),
    }),
    metocSpec('ThunderstormLightModerateHail', 'Thunderstorm Light to Moderate - with Hail', ST, 45, '161404', 'Point7', ['warm'], {
        glyph: g(line('M12 1L15 7H9Z', 1.3), bolt(8)),
    }),
    metocSpec('ThunderstormHeavyHail', 'Thunderstorm Heavy - with Hail', ST, 45, '161405', 'Point7', ['warm'], {glyph: g(line('M12 1L15 7H9Z', 1.3), bolt(8, true))}),
    metocSpec('FunnelCloud', 'Funnel Cloud (Tornado/Waterspout)', ST, 45, '161406', 'Point7', ['warm'], {
        glyph: g(line('M6.5 3L10 7V17L6.5 21M17.5 3L14 7V17L17.5 21', 1.5)),
    }),
    metocSpec('Squall', 'Squall', ST, 45, '161407', 'Point7', ['warm'], {glyph: g(line('M5 3.5L12 8.5L19 3.5L12 21.5Z', 1.5))}),
    metocSpec('Lightning', 'Lightning', ST, 45, '161408', 'Point7', ['warm'], {glyph: g(line('M22 3L4 12.5L16 21', 1.4), line('M12.6 20.4L16 21L16 17.5', 1.4))}),

    // Fog, mist, smoke, haze (Point7).
    ...(() => {
        const dashes = (y: number) => line(`M5 ${y}H10M14 ${y}H19`, 2);
        const full = (y: number) => line(`M4 ${y}H20`, 2);
        return [
            metocSpec('FogShallowPatches', 'Fog - Shallow Patches', WX, 45, '161501', 'Point7', ['yellow'], {glyph: g(dashes(6), dashes(12), dashes(18))}),
            metocSpec('FogShallowContinuous', 'Fog - Shallow Continuous', WX, 45, '161502', 'Point7', ['yellow'], {glyph: g(dashes(6), dashes(12), full(18))}),
            metocSpec('FogPatchy', 'Fog - Patchy', WX, 45, '161503', 'Point7', ['yellow'], {glyph: g(dashes(6), full(12), dashes(18))}),
            metocSpec('FogSkyVisible', 'Fog - Sky Visible', WX, 45, '161504', 'Point7', ['yellow'], {glyph: g(dashes(6), full(12), full(18))}),
            metocSpec('FogSkyObscured', 'Fog - Sky Obscured', WX, 45, '161505', 'Point7', ['yellow'], {glyph: g(full(6), full(12), full(18))}),
            metocSpec('FreezingFogSkyVisible', 'Fog - Freezing, Sky Visible', WX, 45, '161506', 'Point7', ['warm'], {
                glyph: g(line('M3 6H5.8L10.4 12.1M15 12.1L18 6H21', 2), line('M3 12.1H21M3 18H21', 2), {d: 'M9.4 12.1H15.9L12.2 18Z', fill: 'main'}),
            }),
            metocSpec('FreezingFogSkyObscured', 'Fog - Freezing, Sky Obscured', WX, 45, '161507', 'Point7', ['warm'], {
                glyph: g(line('M3 6H21', 2), line('M6 6L10.4 12.1M15 12.1L18 6', 2), line('M3 12.1H21M3 18H21', 2), {d: 'M9.4 12.1H15.9L12.2 18Z', fill: 'main'}),
            }),
            metocSpec('Mist', 'Mist', WX, 45, '161600', 'Point7', ['yellow'], {glyph: g(full(9), full(15))}),
        ] as const;
    })(),
    metocSpec('Smoke', 'Smoke', WX, 45, '161700', 'Point7', ['brown'], {
        glyph: g(line('M5.5 22V6C6 3 8.5 3 9 6C9.5 14 12 14 12.5 6C13 2 15.5 2 16 6C16.5 14 19 14 19.5 6C20 3.5 21.5 3.5 22 5', 1.5)),
    }),
    metocSpec('Haze', 'Haze', WX, 45, '161800', 'Point7', ['brown'], {
        glyph: g(line('M12 12C9 6.5 3 7 3 12C3 17 9 17.5 12 12C15 6.5 21 7 21 12C21 17 15 17.5 12 12Z', 1.6)),
    }),
    metocSpec('DustOrSandLightModerate', 'Dust or Sand - Light to Moderate', WX, 45, '161901', 'Point7', ['brown'], {
        glyph: g(line('M2 12H21M17.5 8.5L21 12L17.5 15.5', 1.5), line('M15 4.5C12.5 2 8 3.5 9 6.5C10 9.5 15.5 9.5 15.5 14C15.5 18.5 10 20 8 17.5', 1.5)),
    }),
    metocSpec('DustOrSandSevere', 'Dust or Sand - Severe', WX, 45, '161902', 'Point7', ['brown'], {
        glyph: g(line('M2 10.5H21M2 13.5H21M17 7L21 12L17 17', 1.5), line('M15 4.5C12.5 2 8 3.5 9 6.5C10 9.5 15.5 9.5 15.5 14C15.5 18.5 10 20 8 17.5', 1.5)),
    }),
    metocSpec('DustDevil', 'Dust or Sand - Dust Devil', WX, 45, '161903', 'Point7', ['brown'], {
        glyph: g(line(COIL, 1.5)),
    }),
    metocSpec('BlowingDustOrSand', 'Dust or Sand - Blowing Dust or Sand', WX, 45, '161904', 'Point7', ['brown'], {
        glyph: g(line('M12 23V2M8.5 5.5L12 2L15.5 5.5', 1.4), line('M16 7C14 5 9 5.5 9 8.5C9 11.5 15.5 11 15.5 15C15.5 19 10.5 19.5 8.5 17.5', 1.5)),
    }),

    // Tropical storm systems (Point8): the operator draws them red, purple or black.
    metocSpec('TropicalDepression', 'Tropical Depression', ST, 45, '162001', 'Point8', ['warm'], {
        operatorColor: ['warm', 'isotach', 'black'],
        glyph: g({circle: [12, 12, 7], width: 1.6}, line('M7 7L17 17M17 7L7 17', 1.6)),
    }),
    ...(() => {
        const arms: GlyphPart[] = [
            {d: 'M8.4 11.2C8.2 6.6 11.4 3.2 17.5 1.8C14.6 4 13.1 6.6 13.4 8.6Z', fill: 'main'},
            {d: 'M15.6 12.8C15.8 17.4 12.6 20.8 6.5 22.2C9.4 20 10.9 17.4 10.6 15.4Z', fill: 'main'},
        ];
        return [
            metocSpec('TropicalStorm', 'Tropical Storm', ST, 45, '162002', 'Point8', ['warm'], {
                operatorColor: ['warm', 'isotach', 'black'],
                glyph: g(arms, {circle: [12, 12, 3.6], width: 1.8}),
            }),
            metocSpec('HurricaneTyphoon', 'Hurricane/Typhoon', ST, 45, '162003', 'Point8', ['warm'], {
                operatorColor: ['warm', 'isotach', 'black'],
                glyph: g(arms, {circle: [12, 12, 4.2], fill: 'main'}),
            }),
        ] as const;
    })(),
    metocSpec('VolcanicEruption', 'Volcanic Eruption', ST, 45, '162100', 'Point7', ['black'], {
        glyph: g(line('M4 21H9.5M14.5 21H20M5 21L8.5 11.5H15.5L19 21', 1.6), dot(12, 19.5, 2), line('M7.5 8L5.5 3.5M12 7V2.5M16.5 8L18.5 3.5', 1.6)),
    }),
    metocSpec('VolcanicAsh', 'Volcanic Ash', ST, 45, '162101', 'Point7', ['black'], {
        operatorColor: ['black', 'brown'],
        glyph: g(line('M3.5 21.5L12 7L20.5 21.5Z', 1.6), line('M12 7Q12.6 2.8 14.4 4.6T17.6 4.2T21 3.4', 1.4)),
    }),
    metocSpec('TropopauseLevel', 'Tropopause Level', ST, 45, '162200', 'Point7', ['black'], {
        valueField: v('Height (hundreds of ft)', '380'),
        glyph: g(line('M2 6.5H22V17.5H2Z', 1.4), {text: '$value', x: 12, y: 12.3, size: 8}),
    }),
    metocSpec('FreezingLevel', 'Freezing Level', ST, 45, '162300', 'Point7', ['black'], {
        valueField: v('Height (hundreds of ft)', '100'),
        glyph: g(line('M1 6.5H23V17.5H1Z', 1.4), {text: '0°:', x: 6.6, y: 12.3, size: 7}, {text: '$value', x: 16, y: 12.3, size: 7}),
    }),
    metocSpec('PrecipitationUnknown', 'Precipitation of Unknown Type and Intensity', WX, 45, '162400', 'Point7', ['green'], {glyph: g(line('M3.5 16A8.6 8.6 0 0 1 20.5 16', 2))}),

    // State of the ground (Point1).
    metocSpec('GroundDry', 'Surface Dry Without Cracks or Appreciable Dust or Loose Sand', SG, 45, '190101', 'Point1', ['black'], {glyph: g(BOX)}),
    metocSpec('GroundMoist', 'Surface Moist', SG, 45, '190102', 'Point1', ['black'], {glyph: g(BOX, dot(12, 12, 1.4))}),
    metocSpec('GroundWet', 'Surface Wet, Standing Water in Small or Large Pools', SG, 45, '190103', 'Point1', ['black'], {glyph: g(BOX, dot(12, 9.5, 1.4), dot(12, 14.5, 1.4))}),
    metocSpec('GroundFlooded', 'Surface Flooded', SG, 45, '190104', 'Point1', ['black'], {glyph: g(BOX, dot(12, 9.5, 1.4), dot(9.5, 14.5, 1.4), dot(14.5, 14.5, 1.4))}),
    metocSpec('GroundFrozen', 'Surface Frozen', SG, 45, '190105', 'Point1', ['black'], {glyph: g(BOX, line('M5 16H19', 1.4))}),
    metocSpec('GroundGlaze', 'Glaze (Thin Ice) on Ground', SG, 45, '190106', 'Point1', ['black'], {
        glyph: g(BOX, line('M5 13.5Q7 10.5 9 13.5Q10 16.5 12 16.5Q14 16.5 15 13.5Q17 10.5 19 13.5', 1.4)),
    }),
    metocSpec('GroundLooseDustNotCovering', 'Loose Dry Dust or Sand not Covering Ground Completely', SG, 45, '190107', 'Point1', ['black'], {
        glyph: g(OPEN_TOP, {text: 'S', x: 12, y: 12.5, size: 11}),
    }),
    metocSpec('GroundThinLooseDust', 'Thin Loose Dry Dust or Sand Covering Ground Completely', SG, 45, '190108', 'Point1', ['black'], {
        glyph: g(BOX, {text: 'S', x: 12, y: 12.5, size: 11}),
    }),
    metocSpec('GroundThickLooseDust', 'Moderate/Thick Loose Dry Dust or Sand Covering Ground Completely', SG, 45, '190109', 'Point1', ['black'], {
        glyph: g(BOX, {text: 'S', x: 12, y: 12.5, size: 11}, line('M12 6V18', 1.2)),
    }),
    metocSpec('GroundExtremelyDry', 'Extremely Dry with Cracks', SG, 45, '190110', 'Point1', ['black'], {glyph: g(BOX, {text: 'D', x: 12, y: 12.5, size: 11})}),
    metocSpec('GroundPredominantlyIce', 'Predominately Ice Covered', SG, 45, '190201', 'Point1', ['black'], {
        glyph: g(BOX, line('M5 10Q7 7 9 10Q10 13 12 13Q14 13 15 10Q17 7 19 10', 1.4), line('M5 15Q7 12 9 15Q10 18 12 18Q14 18 15 15Q17 12 19 15', 1.4)),
    }),
    metocSpec('GroundCompactSnowLessHalf', 'Compact or Wet Snow (with or without Ice) Covering Less Than One-Half of Ground', SG, 45, '190202', 'Point1', ['black'], {
        glyph: g(L_SHAPE, asterisk()),
    }),
    metocSpec('GroundCompactSnowAtLeastHalf', 'Compact or Wet Snow (with or without Ice) Covering at Least One-Half of Ground, but Ground not Completely Covered', SG, 45, '190203', 'Point1', ['black'], {
        glyph: g(OPEN_TOP, asterisk()),
    }),
    metocSpec('GroundCompactSnowEven', 'Even Layer of Compact or Wet Snow Covering Ground Completely', SG, 45, '190204', 'Point1', ['black'], {glyph: g(BOX, asterisk(12, 12.2))}),
    metocSpec('GroundCompactSnowUneven', 'Uneven Layer of Compact or Wet Snow Covering Ground Completely', SG, 45, '190205', 'Point1', ['black'], {
        glyph: g(BOX, DIAGONAL, asterisk(9.3, 9)),
    }),
    metocSpec('GroundLooseSnowLessHalf', 'Loose Dry Snow Covering Less Than One-Half of Ground', SG, 45, '190206', 'Point1', ['black'], {
        glyph: g(L_SHAPE, asterisk(), downArrow(17.1, 5.1)),
    }),
    metocSpec('GroundLooseSnowAtLeastHalf', 'Loose Dry Snow Covering at least One-Half of Ground, but Ground not Completely Covered', SG, 45, '190207', 'Point1', ['black'], {
        glyph: g(OPEN_TOP, asterisk(12, 11.7), downArrow(17, 5.1)),
    }),
    metocSpec('GroundLooseSnowEven', 'Even Layer of Loose Dry Snow Covering Ground Completely', SG, 45, '190208', 'Point1', ['black'], {
        glyph: g(BOX, asterisk(12, 12.5), downArrow(17, 6.3)),
    }),
    metocSpec('GroundLooseSnowUneven', 'Uneven Layer of Loose Dry Snow Covering Ground Completely', SG, 45, '190209', 'Point1', ['black'], {
        glyph: g(BOX, DIAGONAL, asterisk(9.3, 9), downArrow(17.2, 9.3)),
    }),
    metocSpec('GroundSnowDeepDrifts', 'Snow Covering Ground Completely, Deep Drifts', SG, 45, '190210', 'Point1', ['black'], {
        glyph: g(BOX, DIAGONAL, asterisk(9.3, 9), RIGHT_ARROW),
    }),
] as const;
