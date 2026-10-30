/**
 * # The editor, for METOC
 *
 * The gestures are `@zaes/symbology-editor`'s ({@link SymbolInteraction}), written once for every
 * family. This binds them to METOC: graphics are stored by `METOC_SCHEMA` and drawn by
 * `METOC_PAINTER`; the wind barb is the directional point — two clicks, the anchor and then the
 * direction the wind blows from, with a rotate handle at its shaft tip; every point symbol has a
 * resize handle that steps through the three sizes, and a rotate handle when the configuration
 * allows turning point symbols; a filled area (Table M-I, Area2) is picked anywhere inside; and the
 * handles and selection take the configured colours.
 */

import {
    METOC_PAINTER,
    METOC_SCHEMA,
    MetocGraphicName,
    POINT_SIZES,
    getMetocConfig,
    getMetocSpec,
    type MetocCollection,
    type MetocFeature,
    type MetocProperties,
    type Pixel,
    type PointSize,
    type ProjectedPosition,
    type PointerInput,
    type ViewAdapter,
} from '../index.js';
import {lineWidth} from '../core/config.js';
import {metocPointScale, metocPointZoomFactor} from '../core/render.js';
import {windBarbTip} from '../symbology/pointPaints.js';
import {
    SymbolInteraction,
    type DirectionRule,
    type EditorChange,
    type EditorFamily,
    type EditorOptions,
    type EditorOverlay as SymbolEditorOverlay,
    type SizeRule,
} from '@zaes/symbology-editor';

export {HANDLE_RADIUS_PX, HIT_TOLERANCE_PX, INSERT_HANDLE_RADIUS_PX} from '@zaes/symbology-editor';
export type {EditMode, EditorAction, EditorListener, HandleMark} from '@zaes/symbology-editor';
export type {Pixel, PointerInput, ViewAdapter};

/** What the editor draws for a METOC graphic being drawn or selected. */
export type EditorOverlay = SymbolEditorOverlay<MetocFeature>;
/** How a host shapes the editor: handle sizes, snapping, allowed actions, a veto, keys. */
export type MetocEditorOptions = EditorOptions<MetocFeature>;
/** A change the editor is about to make, as {@link MetocEditorOptions.beforeChange} sees it. */
export type MetocEditorChange = EditorChange<MetocFeature>;

/** How far from a point symbol's centre its resize handle sits at medium size, in CSS pixels: its pick ring. */
const POINT_RADIUS_PX = 18;

/** A handle `lengthPx` from the anchor, `degrees` clockwise from north. */
const outward = (anchor: ProjectedPosition, degrees: number, lengthPx: number, resolution: number): ProjectedPosition => {
    const a = (degrees * Math.PI) / 180;
    return [anchor[0] + Math.sin(a) * lengthPx * resolution, anchor[1] + Math.cos(a) * lengthPx * resolution];
};

/** The wind barb's direction: where the wind blows from, degrees true, kept in `windDirection`. */
const WIND_DIRECTION: DirectionRule<MetocProperties> = {
    get: (props) => props.windDirection,
    set: (degrees) => ({windDirection: degrees}),
    // The barb is drawn at the graphic's size, so its shaft tip — the handle — moves with it.
    tip: (anchor, degrees, resolution, props) => windBarbTip(anchor, degrees, resolution * metocPointScale(props, resolution)),
};

/** A turned point symbol: `rotation`, degrees clockwise from upright, with a handle above the symbol. */
const ROTATION: DirectionRule<MetocProperties> = {
    get: (props) => props.rotation ?? 0,
    // Upright is no rotation: absent, never 0.
    set: (degrees) => ({rotation: degrees % 360 === 0 ? undefined : degrees % 360}),
    tip: (anchor, degrees, resolution, props) => outward(anchor, degrees, POINT_RADIUS_PX * metocPointScale(props, resolution) + 10, resolution),
};

/**
 * A point symbol's size: the three sizes, the drag rounded to the nearest. The configured default
 * size is written as no size at all, as the properties panel does.
 */
const SIZE: SizeRule<MetocProperties> = {
    get: (props, resolution) => metocPointScale(props, resolution),
    set: (onScreen, resolution) => {
        // The size chosen is the symbol's own: what the drag shows, less the map's zoom shrink.
        const scale = onScreen / (resolution === undefined ? 1 : metocPointZoomFactor(resolution));
        const sizes = Object.entries(POINT_SIZES) as [PointSize, number][];
        const [size] = sizes.reduce((best, s) => (Math.abs(s[1] - scale) < Math.abs(best[1] - scale) ? s : best));
        return {size: size === getMetocConfig().pointSize ? undefined : size};
    },
    radiusPx: POINT_RADIUS_PX,
};

/** METOC as the editor sees it. */
export const METOC_EDITING: EditorFamily<'metoc', MetocProperties> = {
    schema: METOC_SCHEMA,
    painter: METOC_PAINTER,
    direction: (name) => (getMetocSpec(name).directional ? WIND_DIRECTION : undefined),
    // A station plot is laid out by the station model, which has no turn.
    rotation: (name) => (getMetocConfig().allowPointRotation && name !== MetocGraphicName.StationPlot ? ROTATION : undefined),
    size: () => SIZE,
    pickInside: (props) => props.filled === true,
    chrome: () => {
        const cfg = getMetocConfig();
        return {
            handleColor: cfg.handleColor,
            selectionColor: cfg.selectionColor,
            lineWidth: lineWidth(),
            handleOutlineColor: cfg.handleOutlineColor,
            insertHandleColor: cfg.insertHandleColor,
            rotateHandleColor: cfg.rotateHandleColor,
            resizeHandleColor: cfg.resizeHandleColor,
            guideColor: cfg.guideColor,
            selectionWidthPx: cfg.selectionWidth,
        };
    },
};

export class MetocInteraction extends SymbolInteraction<'metoc', MetocProperties> {
    declare readonly collection: MetocCollection;

    constructor(collection: MetocCollection, view: ViewAdapter, options: MetocEditorOptions = {}) {
        super(METOC_EDITING, collection, view, options);
    }
}
