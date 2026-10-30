# @zaes/metoc

The weather and oceanographic graphics of MIL-STD-2525E Change 1, Appendix M (symbol sets 45 and
46) as GeoJSON, with OpenLayers and MapLibre renderers and an editor.

**[Live sample](https://zaes-code.github.io/metoc/)** · **[Product page](https://zaes.com/metoc.html)** · [Catalog of every graphic](https://zaes.com/metoc-catalog.html)

```bash
npm install @zaes/metoc
```

Install `ol` or `maplibre-gl` for the renderer you use.

## Display

```ts
import {MetocCollection, MetocGraphicName, metocFeature} from '@zaes/metoc';
import {MetocOpenLayers} from '@zaes/metoc/openlayers'; // or MetocMapLibre from '@zaes/metoc/maplibre'

const collection = new MetocCollection();
const renderer = new MetocOpenLayers(map, collection);

// Points in drawing order: a front's pips go left of the drawn direction.
collection.add(metocFeature(MetocGraphicName.ColdFront, [[-80, 40], [-90, 42], [-100, 41]]));
collection.add(metocFeature(MetocGraphicName.WindBarb, [[-97.5, 35.4]], {windDirection: 270, windSpeed: 65}));
```

Save with `collection.toGeoJSON()` and restore with `collection.load(json)`.

## Editing

```ts
import {MetocHistory, MetocInteraction, attachMetocEditor} from '@zaes/metoc/editor';

const editor = new MetocInteraction(collection, renderer.view);
const history = new MetocHistory(collection);
editor.subscribe((e) => e.type === 'commit' && history.checkpoint());
attachMetocEditor(renderer, editor);

editor.startDrawing(MetocGraphicName.WarmFront);
```

`getMetocFields(name)` tells a properties dialog which inputs a graphic offers.

## Configuration

```ts
import {configureMetoc} from '@zaes/metoc';

configureMetoc({lineWidth: 3, defaultLineColor: '#dddddd', handleColor: '#ff8c00'});
```

## License

MIT. Made by [Zaes](https://zaes.com).
