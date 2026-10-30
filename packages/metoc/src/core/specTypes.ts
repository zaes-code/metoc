/**
 * # The shape of a catalog entry
 *
 * Types and the helper the catalog's data files build entries with. They live apart from
 * `catalog.ts` because the catalog *derives* the set of graphic names from those data files: the
 * entries cannot be typed by a name type that is computed from them.
 *
 * Most graphics are data. A point symbol is a {@link GlyphDef} (paths, circles and text in a
 * 24-unit box, drawn screen-sized around its anchor); a plain line or area is a
 * {@link LineStyleDef} or {@link AreaStyleDef}. The graphics with real geometry of their own —
 * fronts, isopleths, the wind barb, the convergence-zone band — keep hand-written painters.
 */

import type {
    AreaStyleDef as EngineAreaStyleDef,
    GlyphColor as EngineGlyphColor,
    GlyphDef as EngineGlyphDef,
    GlyphPart as EngineGlyphPart,
    LineDecoration as EngineLineDecoration,
    LineStyleDef as EngineLineStyleDef,
} from '@zaes/symbology-engine';

/** The picker groups, in the standard's order. */
export enum MetocCategory {
    PressureCenters = 'Pressure centers',
    PressureTendency = 'Pressure tendency',
    Fronts = 'Fronts',
    PressureLines = 'Pressure lines',
    TurbulenceIcing = 'Turbulence and icing',
    Winds = 'Winds',
    CloudCover = 'Cloud cover',
    Weather = 'Weather',
    StormsTropical = 'Storms and tropical systems',
    Isopleths = 'Isopleths',
    Areas = 'Areas of weather',
    StateOfGround = 'State of the ground',
    Ice = 'Ice',
    Depth = 'Depth and coast',
    Ports = 'Ports and harbors',
    AidsToNavigation = 'Aids to navigation',
    Hazards = 'Dangers and hazards',
    Bottom = 'Bottom features',
    TideCurrent = 'Tide and current',
    Bioluminescence = 'Bioluminescence',
    BeachSlope = 'Beach slope',
    MineWarfareBottom = 'Mine warfare bottom descriptors',
    MaritimeLimits = 'Maritime limits',
    ManMade = 'Man-made structures',
}

/**
 * A colour role. The palette maps roles to colours, so a host retunes "the cold-front blue" once
 * rather than per graphic. @see DEFAULT_METOC_PALETTE
 */
export type MetocColorRole =
    | 'cold'
    | 'warm'
    | 'occluded'
    | 'black'
    | 'convergence'
    | 'discontinuityGreen'
    | 'isotach'
    | 'isodrosotherm'
    | 'green'
    | 'brown'
    | 'yellow'
    | 'gray'
    | 'magenta'
    | 'icingBrown'
    | 'white';

/**
 * A colour as an entry states it: a role (tunable through the palette), or an exact CSS colour
 * where the standard prints an RGB that is the information itself — a bioluminescence level or a
 * mine-warfare bottom category is *read* by its colour, so a palette must not move it.
 */
export type MetocColor = MetocColorRole | `rgb(${string})` | `rgba(${string})` | `#${string}`;

/** Appendix M's draw rules, Table M-I. */
export type MetocDrawRule =
    | 'Point1'
    | 'Point2'
    | 'Point3'
    | 'Point4'
    | 'Point5'
    | 'Point6'
    | 'Point7'
    | 'Point8'
    | 'Line1'
    | 'Line2'
    | 'Line3'
    | 'Line4'
    | 'Line5'
    | 'Line6'
    | 'Line7'
    | 'Line8'
    | 'Area1'
    | 'Area2';

/** How a graphic is drawn and saved: a point (GeoJSON Point), an open line, or a closed area (Polygon). */
export type MetocGeometryKind = 'point' | 'line' | 'area';

// ── glyphs ─────────────────────────────────────────────────────────────────────

/**
 * A colour inside a glyph or style: `'main'` is the graphic's own colour (its first colour, or
 * the operator's where the standard allows one); anything else is a {@link MetocColor}. The glyph
 * format itself is the engine's; these are its METOC instances.
 */
export type GlyphColor = EngineGlyphColor<MetocColor>;
export type GlyphPart = EngineGlyphPart<MetocColor>;
/** A point symbol, drawn as its standard icon (the engine's glyph format, in METOC colours). */
export type GlyphDef = EngineGlyphDef<MetocColor>;

// ── line and area styles ───────────────────────────────────────────────────────

/** A line's decorations, plain line and plain area: the engine's formats, in METOC colours. */
export type LineDecoration = EngineLineDecoration<MetocColor>;
export type LineStyleDef = EngineLineStyleDef<MetocColor>;
export type AreaStyleDef = EngineAreaStyleDef<MetocColor>;

// ── the entry ──────────────────────────────────────────────────────────────────

export interface MetocValueField {
    /** The input's label. */
    label: string;
    /** An example, as the input's placeholder. */
    placeholder: string;
}

/** What the standard says about one graphic, with its name typed as the literal it is. */
export interface MetocSpecDef<N extends string = string> {
    readonly name: N;
    /** As Table A-LI prints it. */
    readonly displayName: string;
    readonly category: MetocCategory;
    /** 45 Atmospheric or 46 Oceanographic. */
    readonly symbolSet: 45 | 46;
    /**
     * Positions 11-16 of the SIDC: entity, entity type, entity subtype. `null` for the wind barb:
     * 2525E keeps its draw rule (Table M-I) but Table A-LI lists no entity for it, so it has no SIDC
     * and none is invented.
     */
    readonly entityCode: string | null;
    readonly drawRule: MetocDrawRule;
    /** Point, line or area, from Table A-LI's "Geometric Value Rendering" (or, for Line5, Table M-I). */
    readonly geometry: MetocGeometryKind;
    /** A point drawn with a second click for its direction: the wind barb's shaft. */
    readonly directional?: boolean;
    /** The colours the graphic uses, the first being its main colour. */
    readonly colors: readonly MetocColor[];
    /**
     * Where the operator chooses the colour. `true` means any colour; a list means one of those
     * roles. Absent means the standard fixes it and a `color` property is ignored.
     */
    readonly operatorColor?: true | readonly MetocColorRole[];
    /** The graphic carries a value, and what the value field is called. */
    readonly valueField?: MetocValueField;
    /** The operator-defined freeform line and area may be drawn solid or dashed. */
    readonly operatorDash?: boolean;
    /** The tropical storm wind area carries a boxed date-time label (Table M-II, 162004). */
    readonly dateTimeLabel?: boolean;
    /** Its icon, for a point drawn from data. */
    readonly glyph?: GlyphDef;
    /** Its style, for a line drawn from data. */
    readonly lineStyle?: LineStyleDef;
    /** Its style, for an area drawn from data. */
    readonly areaStyle?: AreaStyleDef;
    /** What the standard says about it, in a sentence, where its name alone does not. */
    readonly note?: string;
}

type Extra = Partial<
    Pick<
        MetocSpecDef,
        'operatorColor' | 'valueField' | 'operatorDash' | 'dateTimeLabel' | 'geometry' | 'directional' | 'glyph' | 'lineStyle' | 'areaStyle' | 'note'
    >
>;

/**
 * One catalog entry. The name's literal type is kept (`const N`), so the catalog can derive the
 * union of every graphic name from its data files.
 */
export function metocSpec<const N extends string>(
    name: N,
    displayName: string,
    category: MetocCategory,
    symbolSet: 45 | 46,
    entityCode: string | null,
    drawRule: MetocDrawRule,
    colors: readonly MetocColor[],
    extra: Extra = {},
): MetocSpecDef<N> {
    return {
        name,
        displayName,
        category,
        symbolSet,
        entityCode,
        drawRule,
        geometry: drawRule.startsWith('Area') ? 'area' : drawRule.startsWith('Point') ? 'point' : 'line',
        colors,
        ...extra,
    };
}
