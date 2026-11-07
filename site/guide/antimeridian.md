# The antimeridian

A front drawn across the Pacific should be painted the short way, not across the whole world.

Drawn points are kept **continuous**: each longitude within 180° of the one before, running past
±180 when a graphic crosses it. A line drawn from 179°E to 179°W is saved as `[179, …]` to `[181, …]`.

- `metocFeature` and the collection save points that way, and `drawnPoints` unwraps a file folded
  into ±180°, so every painter reads continuous points.
- The editor measures drags and nudges near the graphic, and the renderers put a point on the world
  copy nearest the view's centre.
- A consumer that needs longitudes in ±180° can fold them with `wrapLongitude`.

```ts
import {wrapLongitude} from '@zaes/metoc';

wrapLongitude(181);   // -179
```
