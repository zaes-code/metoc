# Rendering

The paint layer decides what every graphic looks like. The renderers only draw what it hands
them, so OpenLayers and MapLibre show the same thing, and the same marks can go to an SVG or to
GeoJSON with no map at all.

## OpenLayers

```ts
import {MetocOpenLayers} from '@zaes/metoc/openlayers';

const renderer = new MetocOpenLayers(map, collection, {zIndex: 10});
```

- The view must be **EPSG:3857**.
- The layers carry the class `metoc-layer`, so a CSS filter on your basemap's canvas (a dark
  theme, say) never reaches the symbols. Give your basemap layer its own `className`.
- `zIndex` places the graphics; the editor's overlay goes one above, and its "under" part one below.

## MapLibre

```ts
import {MetocMapLibre} from '@zaes/metoc/maplibre';

const renderer = new MetocMapLibre(map, collection, {beforeId: 'place-labels', pointLeaders: true});
```

| Option | What it does |
|---|---|
| `beforeId` | Insert the layers below this layer id. |
| `idPrefix` | Prefix for the source, layer and image ids (`metoc` by default), when a map shows more than one collection. |
| `pointLeaders` | Stand each point symbol upright on a leader line, clear of the terrain, for a tilted map. `true` for the defaults, or an object for the line's look. |

`renderer.setLeaderLines(false)` lays point symbols back on the map, for example when the map
leaves 3D. A wind barb with a direction stays on the ground either way, since it points the way the
wind blows.

Nothing in `@zaes/metoc/maplibre` imports `maplibre-gl` at run time: the map arrives as an
argument. As with any MapLibre page, serve its worker (`maplibregl.setWorkerUrl`) or the basemap
draws and the GeoJSON never does.

## Screen-sized decoration

Pips, dots, barbs, scallops and labels are sized in CSS pixels and recomputed per frame at the
view's resolution. Nothing is baked into the geometry in meters, so a front's pips are the same size
at every zoom.

Point symbols come in three sizes (small, medium, large: ×0.75, ×1, ×1.5 of the standard's). A
graphic's `size` wins over the configured `pointSize`. Point symbols can also shrink as the map
zooms out: see `pointFullSizeScale` in [Configuration](./configuration).

## Without a map

```ts
import {renderMetocGraphic, paintMetocGraphic, paintMetocGraphicAsGeoJSON} from '@zaes/metoc';

renderMetocGraphic(feature);
// {graphic, labels, handles}: the painted line or area (smoothed), label anchors, drawn points, in EPSG:4326

paintMetocGraphic(feature, {resolution: 2000});
// every mark at that resolution (meters a pixel), in EPSG:3857

paintMetocGraphicAsGeoJSON(feature, {resolution: 2000});
// the same marks as a FeatureCollection, for any GeoJSON consumer
```

`renderMetocGraphic` has no decoration, because decoration depends on the screen. Ask
`paintMetocGraphic` for the marks at a resolution when you draw them yourself.

## A picture for a menu

```ts
import {metocThumbnailSvg, MetocGraphicName} from '@zaes/metoc';

const svg = metocThumbnailSvg(MetocGraphicName.WarmFront, {width: 120, height: 40});
```

A few hundred bytes of SVG per call, drawn by the same paint layer as the map, so a picker can
never disagree with it. `properties` draws a graphic as it is (its colour, dash, value, wind), for a
properties panel's preview.

## Light and dark maps

The library has no light or dark mode: only your page can see its basemap, so it sends the colours
it wants.

```ts
import {configureMetoc, METOC_DARK_MAP, METOC_LIGHT_MAP} from '@zaes/metoc';

configureMetoc(METOC_DARK_MAP);    // the standard's black drawn light, a dark halo
configureMetoc(METOC_LIGHT_MAP);   // puts back everything the dark settings changed
```

Every other Table M-II colour stays as the standard gives it.
