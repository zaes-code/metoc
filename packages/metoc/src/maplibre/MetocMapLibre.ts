/**
 * # The MapLibre renderer, for METOC
 *
 * The engine's MapLibre renderer (`SymbolMapLibre`) drawing a {@link MetocCollection} with the
 * METOC painter. It is a {@link MetocMapHost}, so the editor attaches to it.
 * Its source, layer and image ids start `metoc-` unless `idPrefix` says otherwise. Nothing here
 * imports `maplibre-gl` at run time: the map arrives as an argument.
 */

import type {Map as MapLibreMap} from 'maplibre-gl';
import {SymbolMapLibre, type MapLibrePointLeaders} from '@zaes/symbology-engine/maplibre';
import {METOC_PAINTER, drawnPoints, getMetocSpec, type MetocCollection, type MetocFeature} from '../index.js';

/** A leader line's look: length, colour, halo, width, dot (the engine's `PointLeader`). */
export type MetocPointLeader = Omit<MapLibrePointLeaders<MetocFeature>, 'pointOf' | 'imageKey'>;

export interface MetocMapLibreOptions {
    /** Insert the layers below this layer id. */
    beforeId?: string;
    /** Prefix for the source, layer and image ids, when a map shows more than one collection. */
    idPrefix?: string;
    /**
     * Stand each point symbol on a leader line (a lollipop), upright and clear of the terrain: for a
     * tilted map with terrain. `true` for the engine's defaults. Default off. A wind barb with a direction stays on
     * the ground: it points the way the wind blows, which a raised, upright symbol would lose.
     */
    pointLeaders?: boolean | MetocPointLeader;
}

export class MetocMapLibre extends SymbolMapLibre<MetocFeature> {
    declare readonly collection: MetocCollection;

    constructor(map: MapLibreMap, collection: MetocCollection, options: MetocMapLibreOptions = {}) {
        const {pointLeaders, ...rest} = options;
        super(map, collection, METOC_PAINTER, {...rest, idPrefix: options.idPrefix ?? 'metoc', pointLeaders: leadersFor(pointLeaders)});
    }

    /** Stand point symbols on leader lines, or lay them on the map again (`false`), as a setting changes. */
    setLeaderLines(leaders: boolean | MetocPointLeader): void {
        this.setPointLeaders(leadersFor(leaders));
    }
}

/** METOC's point symbols for the engine's leader lines: every point graphic but a barb with a direction or a turned symbol, which stay on the ground. */
function leadersFor(leaders: boolean | MetocPointLeader | undefined): MapLibrePointLeaders<MetocFeature> | undefined {
    if (!leaders) return undefined;
    return {
        ...(leaders === true ? {} : leaders),
        pointOf: (f) => (getMetocSpec(f.properties.metoc.name).geometry === 'point' && f.properties.metoc.windDirection === undefined && f.properties.metoc.rotation === undefined ? (drawnPoints(f)[0] ?? null) : null),
        imageKey: (f) => JSON.stringify(f.properties.metoc),
    };
}
