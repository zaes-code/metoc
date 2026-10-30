/**
 * # @zaes/metoc
 *
 * Every MIL-STD-2525E Change 1, Appendix M graphic (symbol sets 45 and 46) as plain GeoJSON: the
 * catalog, the paint layer, the collection and validation. It is one symbol family on
 * `@zaes/symbology-engine`, which owns the marks, the glyph format, the store, the map-host seam
 * and the renderers; this package owns every METOC fact, and re-exports what an editor or another
 * renderer needs from the engine, so they import `@zaes/metoc` alone. This root entry is map-agnostic: it
 * never imports a map library, a DOM or a framework, so it runs in a browser, a worker or Node.
 * The display renderers are `@zaes/metoc/openlayers` and `@zaes/metoc/maplibre`.
 *
 * Drawing and editing are `@zaes/metoc/editor`, which meets the renderers at one seam,
 * {@link MetocMapHost}: every renderer implements it, and nothing here uses it for editing.
 *
 * @module @zaes/metoc
 */

// The catalog: every graphic, its name, its spec.
export {
    METOC_GRAPHICS,
    MetocCategory,
    MetocGraphicName,
    getMetocDisplayName,
    getMetocSpec,
    isMetocGraphicName,
    listMetocGraphics,
    metocGraphicByEntityCode,
    minimumPoints,
    pointClicks,
} from './core/catalog.js';
export type {MetocColorRole, MetocDrawRule, MetocGeometryKind, MetocGraphicSpec, MetocValueField} from './core/catalog.js';
export {SIDC_VERSION_2525E_CHANGE_1, metocGraphicFromSidc, metocSidc} from './core/sidc.js';

// Configuration.
export {DEFAULT_METOC_PALETTE, METOC_CONFIG_RANGES, METOC_DARK_MAP, METOC_LIGHT_MAP, colorOf, configureMetoc, getDefaultLineColor, getMetocConfig, resetMetocConfig} from './core/config.js';
export type {MetocConfig, MetocConfigOptions} from './core/config.js';
export {POINT_SIZES, isPointSize} from '@zaes/symbology-engine';
export type {PointSize} from '@zaes/symbology-engine';

// The saved object and the store.
export {drawnPoints, flipMetocFeature, metocFeature, withDrawnPoints} from './core/types.js';
export type {MetocFeature, MetocProperties} from './core/types.js';
export {METOC_SCHEMA, MetocCollection} from './core/collection.js';
export type {CollectionChange, CollectionListener, SkippedFeature} from './core/collection.js';
export {validateMetocFeature} from './core/validation.js';

// Drawing without a map: GeoJSON, marks and thumbnails.
export {METOC_PAINTER, paintMetocGraphic, paintMetocGraphicAsGeoJSON, renderMetocGraphic} from './core/render.js';
export type {MetocRole, RenderedMetocGraphic} from './core/render.js';
export type {Paint, PaintContext, PaintFill, PaintGeometry, PaintStroke, PaintText, SymbolPainter} from '@zaes/symbology-engine';
export {metocThumbnailSvg} from './symbology/thumbnail.js';
export type {ThumbnailOptions} from './symbology/thumbnail.js';

// Web Mercator and the antimeridian: drawn points run continuously past ±180°.
export {WORLD_WIDTH, continuousLonLat, fromMercator, nearestWorldX, toMercator, wrapLongitude} from '@zaes/symbology-engine';
export type {ProjectedPosition} from '@zaes/symbology-engine';

// The map-host seam every renderer implements and the editor attaches to.
export type {HostOverlay, KeyInput, MapHost, MapHostHandlers, OverlayHandle, Pixel, PointerInput, ViewAdapter} from '@zaes/symbology-engine';
export type {MetocMapHost, MetocOverlay} from './core/host.js';
