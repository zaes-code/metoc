/**
 * The display-only viewer. It imports `@zaes/metoc` and its OpenLayers renderer and nothing else,
 * no editor, so it proves the display stands on its own. `check:layering` holds it to that. Not published.
 */

import OlMap from 'ol/Map.js';
import View from 'ol/View.js';
import {defaults as defaultControls} from 'ol/control/defaults.js';
import TileLayer from 'ol/layer/Tile.js';
import {fromLonLat} from 'ol/proj.js';
import OSM from 'ol/source/OSM.js';
import 'ol/ol.css';
import {MetocCollection, MetocGraphicName as N, metocFeature} from '@zaes/metoc';
import {MetocOpenLayers} from '@zaes/metoc/openlayers';

const collection = new MetocCollection();
const add = (...args: Parameters<typeof metocFeature>) => collection.add(metocFeature(...args));

add(N.LowPressureCenter, [[-97, 41]], {value: '996'});
add(N.HighPressureCenter, [[-80, 36]], {value: '1028'});
add(N.ColdFront, [[-97, 41], [-99, 37], [-102, 33], [-105, 30]]);
add(N.WarmFront, [[-97, 41], [-92, 40], [-87, 38.5]]);
add(N.OccludedFront, [[-97, 41], [-98, 44], [-96.5, 46.5]]);
add(N.IsobarSurface, [[-108, 44], [-102, 47], [-94, 48], [-88, 46], [-84, 42]], {value: '1004'});
add(N.IsobarSurface, [[-112, 40], [-106, 36], [-100, 28.5]], {value: '1008'});
add(N.Thunderstorm, [[-94, 36], [-91, 37], [-89, 35], [-91, 32.5], [-94, 33.5]]);
add(N.WindBarb, [[-90, 29]], {windDirection: 200, windSpeed: 25});
add(N.WindBarb, [[-104, 39]], {windDirection: 320, windSpeed: 35});

const map = new OlMap({
    target: 'map',
    // The OSM attribution stays visible (OSM Tile Usage Policy).
    layers: [new TileLayer({source: new OSM(), opacity: 0.65})],
    controls: defaultControls({attributionOptions: {collapsible: false}}),
    view: new View({center: fromLonLat([-96, 39]), zoom: 4.6}),
});
new MetocOpenLayers(map, collection);
