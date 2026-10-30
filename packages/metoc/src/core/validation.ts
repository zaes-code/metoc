/**
 * # What is wrong with a graphic
 *
 * Problems a renderer can still draw but an operator should hear about: an area whose outline
 * crosses itself (its inside is ambiguous, and a fill or a fitted label follows no rule anyone
 * meant), a wind barb with no direction (Table M-I: "winds with missing direction are not
 * displayed"). The editor refuses to *finish* a self-crossing area; this is for everything else —
 * an edit that makes one, or a file that brings one in.
 */

import {getMetocSpec, minimumPoints} from './catalog.js';
import {ringSelfIntersects, toMercator} from '@zaes/symbology-engine';
import {drawnPoints, type MetocFeature} from './types.js';

export function validateMetocFeature(feature: MetocFeature): string[] {
    const problems: string[] = [];
    const spec = getMetocSpec(feature.properties.metoc.name);
    const points = drawnPoints(feature);
    if (points.length < minimumPoints(spec)) problems.push(`needs at least ${minimumPoints(spec)} points`);
    if (spec.geometry === 'area' && ringSelfIntersects(points.map(toMercator))) problems.push('the outline crosses itself');
    // A barb with no direction is "not displayed"; a station plot without a wind is still a station plot.
    if (spec.directional && spec.name !== 'StationPlot' && feature.properties.metoc.windDirection === undefined) problems.push('no wind direction: Table M-I draws the plot circle only');
    return problems;
}
