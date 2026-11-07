# Configuration

One configuration for the whole package: a palette by colour role, line and label sizes, and the
editor's chrome. Renderers read it on their next paint.

```ts
import {configureMetoc, getMetocConfig, resetMetocConfig} from '@zaes/metoc';

configureMetoc({lineWidth: 3, defaultLineColor: '#dddddd', handleColor: '#ff8c00'});
getMetocConfig();     // a frozen snapshot of the settings in force
resetMetocConfig();   // back to the defaults
```

`configureMetoc` merges what you pass. Numbers are clamped to `METOC_CONFIG_RANGES`, and a value of
the wrong kind (a colour not in CSS form, an unknown point size) is ignored, keeping the setting in
force. Passing `undefined` for an optional setting removes it.

An application that loads the package twice, as an ES module and as CommonJS, still has one
configuration.

## Lines and labels

| Setting | Default | What it does |
|---|---|---|
| `lineWidth` | `2` | Stroke width in CSS pixels (1–8) |
| `pipSize` | `10` | A front's pips in CSS pixels; other decoration is proportioned from it (4–24) |
| `smoothLines` | `true` | Join drawn points with a curve through each of them, areas too |
| `areaFillOpacity` | `0.35` | Opacity of an Area2 fill |
| `defaultLineColor` | none | Recolours what the standard draws **black**, and nothing else, for dark or imagery maps |
| `labelSize` | `13` | Label font size in CSS pixels |
| `labelColor` | none | One colour for every label; absent, each label takes its graphic's colour |
| `labelFont` | `sans-serif` | A CSS font-family list for all text |
| `labelHalo`, `labelHaloWidth` | white, `3` | The halo behind text; width 0 draws none |
| `showLabels` | `true` | Off, graphics show without values, heights and date-times; a symbol's own text stays |

## Point symbols

| Setting | Default | What it does |
|---|---|---|
| `pointSize` | `'medium'` | `'small'`, `'medium'` or `'large'` for a graphic that states no `size` |
| `allowPointRotation` | `false` | Offer a rotate handle on point symbols, saved as `rotation` |
| `pointFullSizeScale` | none | Shrink point symbols beyond this map scale (the N of 1:N): half size at four times the scale |
| `pointMinScale` | `0.4` | The smallest a shrinking point symbol gets |

## Colours

`palette` holds the standard's colours by role (`cold`, `warm`, `occluded`, `black`, …), from Table
M-II. Change one with `configureMetoc({palette: {black: '#e2e6eb'}})`; the rest stay.
`DEFAULT_METOC_PALETTE` is the standard's, and `METOC_LIGHT_MAP` and `METOC_DARK_MAP` are ready-made
settings for a light and a dark basemap.

## Editor chrome

`handleColor`, `selectionColor`, `handleOutlineColor`, `insertHandleColor`, `rotateHandleColor`,
`resizeHandleColor`, `guideColor` and `selectionWidth` colour and size the editor's handles, the
selection highlight and the construction line.
