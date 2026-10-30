/**
 * # The OpenLayers renderer, for METOC
 *
 * The engine's OpenLayers renderer (`SymbolOpenLayers`) drawing a {@link MetocCollection} with
 * the METOC painter. It is a {@link MetocMapHost}, so the editor attaches to it.
 * The layers carry the class `metoc-layer`, so a host's CSS filter on its basemap never reaches
 * the symbols. The view must be EPSG:3857, the projection the paint layer works in.
 */

import type OlMap from 'ol/Map.js';
import {SymbolOpenLayers} from '@zaes/symbology-engine/openlayers';
import {METOC_PAINTER, type MetocCollection, type MetocFeature} from '../index.js';

export interface MetocOpenLayersOptions {
    /** Layer z-index; the overlay goes one above, its "under" part one below. */
    zIndex?: number;
}

export class MetocOpenLayers extends SymbolOpenLayers<MetocFeature> {
    declare readonly collection: MetocCollection;

    constructor(map: OlMap, collection: MetocCollection, options: MetocOpenLayersOptions = {}) {
        super(map, collection, METOC_PAINTER, {...options, className: 'metoc-layer', rendererName: 'MetocOpenLayers'});
    }
}
