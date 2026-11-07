# Getting started

## Install

```bash
npm install @zaes/metoc
```

Then the map library you render with:

```bash
npm install ol            # for @zaes/metoc/openlayers
npm install maplibre-gl   # for @zaes/metoc/maplibre
```

## A graphic without a map

```ts
import {MetocGraphicName, metocFeature, renderMetocGraphic, metocSidc} from '@zaes/metoc';

// Points in drawing order: Appendix M sets a front's pip side from it.
const front = metocFeature(MetocGraphicName.ColdFront, [[-80, 40], [-90, 42], [-100, 41]]);

renderMetocGraphic(front);              // {graphic, labels, handles} as EPSG:4326 GeoJSON
metocSidc(MetocGraphicName.ColdFront);  // '150045000011030100000000000000'
```

`front` is an ordinary GeoJSON `Feature`. Store it, send it, load it back: see
[The saved object](./saved-object).

## On a map

Every graphic lives in a `MetocCollection`. A renderer draws the collection and redraws it when it
changes.

::: code-group

```ts [OpenLayers]
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import {MetocCollection, MetocGraphicName, metocFeature} from '@zaes/metoc';
import {MetocOpenLayers} from '@zaes/metoc/openlayers';

const map = new Map({
    target: 'map',
    layers: [new TileLayer({source: new OSM()})],
    view: new View({center: [-10_000_000, 4_800_000], zoom: 4}), // EPSG:3857
});

const collection = new MetocCollection();
const renderer = new MetocOpenLayers(map, collection);

collection.add(metocFeature(MetocGraphicName.ColdFront, [[-80, 40], [-90, 42], [-100, 41]]));
```

```ts [MapLibre]
import maplibregl from 'maplibre-gl';
import {MetocCollection, MetocGraphicName, metocFeature} from '@zaes/metoc';
import {MetocMapLibre} from '@zaes/metoc/maplibre';

const map = new maplibregl.Map({container: 'map', style: 'https://demotiles.maplibre.org/style.json', center: [-90, 40], zoom: 3});

map.on('load', () => {
    const collection = new MetocCollection();
    const renderer = new MetocMapLibre(map, collection);
    collection.add(metocFeature(MetocGraphicName.ColdFront, [[-80, 40], [-90, 42], [-100, 41]]));
});
```

:::

The OpenLayers view must be EPSG:3857, the projection the paint layer works in. MapLibre needs its
worker served, as any MapLibre page does.

## Drawing and editing

```ts
import {MetocHistory, MetocInteraction, attachMetocEditor} from '@zaes/metoc/editor';

const editor = new MetocInteraction(collection, renderer.view);
const history = new MetocHistory(collection);
editor.subscribe((e) => e.type === 'commit' && history.checkpoint());
const detach = attachMetocEditor(renderer, editor);

editor.startDrawing(MetocGraphicName.WarmFront);
```

Click to place points, double-click or press Enter to finish. See
[Drawing and editing](./editing) for the rest.

## Save and restore

```ts
const json = collection.toGeoJSON();   // a FeatureCollection, one feature per graphic
collection.load(json);                 // {loaded, skipped}
```

## The sample page

The [live sample](https://zaes-code.github.io/metoc/) draws and edits every graphic on OpenLayers
and MapLibre, flat or in 3D on terrain, with a sample gallery, undo and redo, GeoJSON export and
import, and light and dark themes. Its source is in the
[repository](https://github.com/zaes-code/metoc): `npm install`, then `npm start`.
