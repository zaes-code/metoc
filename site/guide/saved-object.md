# The saved object

A METOC graphic is one GeoJSON feature. Its properties carry one object, `properties.metoc`.

```json
{
  "type": "Feature",
  "id": "metoc-1",
  "geometry": {"type": "LineString", "coordinates": [[-80, 40], [-90, 42], [-100, 41]]},
  "properties": {"metoc": {"name": "ColdFront"}}
}
```

- A **point** graphic is a `Point`, a **line** a `LineString`, an **area** a `Polygon` with one
  closed ring. Coordinates are EPSG:4326 `[lon, lat]`.
- The points are the ones the operator drew, **in drawing order**. For a line the order is
  information: Appendix M sets a front's pip side from it. Pips go left of the drawn direction,
  so a front drawn right to left has its pips below it.
- Nothing about the view travels with a graphic: no zoom, no resolution, no screen size.

## Building one

```ts
import {MetocGraphicName, metocFeature} from '@zaes/metoc';

metocFeature(MetocGraphicName.IsobarSurface, [[-100, 45], [-90, 47], [-80, 45]], {value: '1012'});
metocFeature(MetocGraphicName.InstrumentFlightRule, [[-95, 35], [-90, 36], [-91, 32]]);   // the ring is closed for you
```

`metocFeature(name, points, extra?, id?)` picks the geometry from the graphic's kind. For an area
you pass the drawn points only; the closing point is the geometry's business.

## The properties

| Property | What it is |
|---|---|
| `name` | The graphic, a `MetocGraphicName`. Required. |
| `value` | The value an isopleth writes at its ends and middle, or an area writes inside. Free text. |
| `color` | A CSS colour, read only where the standard leaves the colour to the operator. |
| `dashed` | The operator-defined freeform line or area, drawn dashed. |
| `filled` | An area drawn colour-filled with no outer boundary line (Table M-I, Area2). |
| `dtg` | The date-time label, such as `221800ZOCT26`, boxed beside a tropical storm wind area. |
| `windDirection`, `windSpeed` | A wind barb's or station plot's wind: see [Wind barbs and station plots](./winds). |
| `size` | `'small'`, `'medium'` or `'large'` for a point graphic, over the configured `pointSize`. |
| `rotation` | Degrees clockwise from upright for a turned point symbol. |

**Absent means absent.** `value`, `color` and `dashed` are left out unless set, and the standard's
colour is never written back into `color`. A label that is absent or blank draws nothing, never an
empty box.

## Changing a graphic

Code that edits a graphic works on its **drawn points**, never on raw coordinates, so lines and
areas share every rule and nothing closes a ring by hand:

```ts
import {drawnPoints, withDrawnPoints, flipMetocFeature} from '@zaes/metoc';

const points = drawnPoints(feature);                 // an area's ring without its closing point
const moved = withDrawnPoints(feature, points.map(([x, y]) => [x + 1, y]));
const flipped = flipMetocFeature(front);             // the pips move to the other side
```

In a collection, use `collection.setPoints(id, points)` and `collection.setProperties(id, patch)`.
Setting a property to `undefined` removes it.

## The collection

```ts
import {MetocCollection} from '@zaes/metoc';

const collection = new MetocCollection();
const id = collection.add(feature);
collection.get(id);
collection.list();
collection.remove(id);

const unsubscribe = collection.subscribe((change) => { /* redraw, save, … */ });

const json = collection.toGeoJSON();
const {loaded, skipped} = collection.load(json, {replace: true});
```

`load` takes a `FeatureCollection`, a feature or an array of them. It keeps what it can read and
returns the rest in `skipped` with the reason, and it drops properties a graphic does not use.
