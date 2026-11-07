/**
 * S-412 Marine Weather Warnings (WMO, on IHO S-100): the warning areas a national weather service
 * issues for wind, waves, ice accretion, restricted visibility and thunderstorms.
 *
 * Every warning is a surface. Its colour is its threshold, as the S-412 portrayal catalogue draws
 * it: a 0.64 mm solid outline and a colour fill at the catalogue's transparency, the colours its
 * day palette gives each token. The specification is still a draft (feature catalogue 1.1.0); where
 * its portrayal lags its feature catalogue, the entry says so in `note`.
 */

import {MetocCategory, metocSpec, type AreaStyleDef} from '../core/specTypes.js';

const W = MetocCategory.MarineWarnings;

/** CSS pixels per millimetre on screen (96 per inch): S-100 portrayal sizes are millimetres. */
export const S100_PX_PER_MM = 96 / 25.4;

/** The S-412 day palette, by its colour tokens (portrayal catalogue colorProfile.xml). */
export const S412_COLORS = {
    WXGRN: '#00ff00',
    WXYLW: '#ffff00',
    WXORG: '#ffa500',
    WXRED: '#ff0000',
    WXBLU: '#0000ff',
    WXVLB: '#d2ebf5',
    WXLBL: '#add8e6',
    WXSKB: '#87ceeb',
    WXSTB: '#4682b4',
    WXDSB: '#00008b',
    WXNAV: '#000080',
    WXLPN: '#f0c0f0',
    WXHPK: '#f000f0',
    WXBRN: '#965a28',
    WXGRY: '#787864',
} as const;

type Token = keyof typeof S412_COLORS;

/**
 * An S-412 warning area: the outline in the graphic's main colour (its first, the rule's line
 * token), the fill in the rule's fill token at `1 - transparency`.
 */
function warning(fill: Token, transparency: number): {areaStyle: AreaStyleDef} {
    return {
        areaStyle: {
            fill: {color: S412_COLORS[fill], opacity: 1 - transparency},
            outline: {color: 'main', widthPx: 0.64 * S100_PX_PER_MM},
        },
    };
}

const s412 = (feature: string, attribute?: string, code?: number) => ({source: 'S-412' as const, s100: {feature, ...(attribute ? {attribute, codes: [code!]} : {})}});

export const S412_SPECS = [
    // WindWarning, windWarningThreshold 1-4.
    metocSpec('S412WindWarningNearGale', 'Wind Warning - Near Gale Force', W, 45, null, 'Area1', [S412_COLORS.WXGRN], {
        ...warning('WXGRN', 0.5),
        ...s412('WindWarning', 'windWarningThreshold', 1),
    }),
    metocSpec('S412WindWarningGale', 'Wind Warning - Gale Force', W, 45, null, 'Area1', [S412_COLORS.WXYLW], {
        ...warning('WXYLW', 0.5),
        ...s412('WindWarning', 'windWarningThreshold', 2),
    }),
    metocSpec('S412WindWarningStorm', 'Wind Warning - Storm Force', W, 45, null, 'Area1', [S412_COLORS.WXORG], {
        ...warning('WXORG', 0.5),
        ...s412('WindWarning', 'windWarningThreshold', 3),
    }),
    metocSpec('S412WindWarningHurricane', 'Wind Warning - Hurricane Force', W, 45, null, 'Area1', [S412_COLORS.WXRED], {
        ...warning('WXRED', 0.5),
        ...s412('WindWarning', 'windWarningThreshold', 4),
    }),

    // SignificantWaveHeightWarning, significantWaveHeightWarningThreshold 1-5.
    metocSpec('S412WaveWarning2To4m', 'Significant Wave Height Warning - 2.5 to 4 m', W, 46, null, 'Area1', [S412_COLORS.WXBLU], {
        ...warning('WXVLB', 0.4),
        ...s412('SignificantWaveHeightWarning', 'significantWaveHeightWarningThreshold', 1),
        note: 'The draft portrayal catalogue has no rule for this threshold: its wave rules predate it and stop at four levels, from 4 to 6 m. Drawn in the palette\'s very light blue (WXVLB, defined there and used by no rule), lighter than the 4 to 6 m warning, with the same outline.',
    }),
    metocSpec('S412WaveWarning4To6m', 'Significant Wave Height Warning - 4 to 6 m', W, 46, null, 'Area1', [S412_COLORS.WXBLU], {
        ...warning('WXLBL', 0.4),
        ...s412('SignificantWaveHeightWarning', 'significantWaveHeightWarningThreshold', 2),
        note: 'The portrayal catalogue\'s first wave level, which its draft portrayals sheet names "four to six metres"; the feature catalogue has since put 2.5 to 4 m first.',
    }),
    metocSpec('S412WaveWarning6To9m', 'Significant Wave Height Warning - 6 to 9 m', W, 46, null, 'Area1', [S412_COLORS.WXBLU], {
        ...warning('WXSKB', 0.4),
        ...s412('SignificantWaveHeightWarning', 'significantWaveHeightWarningThreshold', 3),
    }),
    metocSpec('S412WaveWarning9To14m', 'Significant Wave Height Warning - 9 to 14 m', W, 46, null, 'Area1', [S412_COLORS.WXDSB], {
        ...warning('WXSTB', 0.5),
        ...s412('SignificantWaveHeightWarning', 'significantWaveHeightWarningThreshold', 4),
    }),
    metocSpec('S412WaveWarningOver14m', 'Significant Wave Height Warning - Over 14 m', W, 46, null, 'Area1', [S412_COLORS.WXNAV], {
        ...warning('WXNAV', 0.6),
        ...s412('SignificantWaveHeightWarning', 'significantWaveHeightWarningThreshold', 5),
    }),

    // IceAccretionWarning, iceAccretionRate 1-2.
    metocSpec('S412IceAccretionModerate', 'Ice Accretion Warning - Moderate Icing', W, 46, null, 'Area1', [S412_COLORS.WXLPN], {
        ...warning('WXLPN', 0.5),
        ...s412('IceAccretionWarning', 'iceAccretionRate', 1),
    }),
    metocSpec('S412IceAccretionSevere', 'Ice Accretion Warning - Severe Icing', W, 46, null, 'Area1', [S412_COLORS.WXHPK], {
        ...warning('WXHPK', 0.5),
        ...s412('IceAccretionWarning', 'iceAccretionRate', 2),
    }),

    metocSpec('S412RestrictedVisibility', 'Restricted Visibility Warning', W, 45, null, 'Area1', [S412_COLORS.WXGRY], {
        ...warning('WXGRY', 0.7),
        ...s412('RestrictedVisibilityWarning'),
    }),
    metocSpec('S412Thunderstorm', 'Thunderstorm Warning', W, 45, null, 'Area1', [S412_COLORS.WXBRN], {
        ...warning('WXBRN', 0.5),
        ...s412('ThunderstormWarning'),
    }),
] as const;
