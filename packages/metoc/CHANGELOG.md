# Changelog

All notable changes to `@zaes/metoc`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Dates are
the npm publish dates — when a version actually became installable.

> **Versions 0.1.0 – 0.2.0 were reconstructed from the commit history after the fact.**
> This file was added afterwards, so those entries summarize what each release contained
> rather than being written alongside it. They are accurate but not exhaustive.

---

## [Unreleased]

## [0.3.0] — 2026-11-16

### Added

- `metocGraphicFromSidc` reads a MIL-STD-2525D Wind Plot (version 10 or 11, symbol set 45, entity
  140200) as the wind barb. 2525E Change 1 removed that entity (SCP 23-045-DS), so the barb is still written with no SIDC.
  A 30-digit base MIL-STD-2525E code (version 13) with that entity is read as the barb too: SCP
  23-045-DS is incorporated by Change 1 (version 15), and the base 2525E predates it. That reading
  has not been confirmed against the base 2525E's own text.

### Fixed

- `readS100Dataset` reads multi-part geometry: every surface of a `MultiSurface` and every patch of
  a `Surface` becomes an area of its own, as does every curve of a `MultiCurve` and every point of a
  `MultiPoint`, each with the feature's attributes and a warning that the feature was split. It
  read the first part only and dropped the rest without a word. A curve's segments and a ring's
  curve members are joined (only the first was read), an `OrientableCurve` with orientation `-` is
  reversed, and geometry given by `xlink:href` is followed; a reference the dataset does not hold
  is listed in `skipped` with that reason.
- `readS100Dataset` reads features placed directly under the dataset element, which it ignored
  with nothing in `skipped`. GML geometry objects among the members are read where a feature
  refers to them and are no longer taken for features.

### Changed

- Depends on `@zaes/symbology-engine` and `@zaes/symbology-editor` **0.4.1** (exactly), the engine
  it is built and tested against; it pinned 0.1.1 before.
- A wind of 3 or 4 kt draws a half barb, as the WMO station model does; it drew the shaft alone.
  Table M-I's rule covers 1–2 kt (the shaft alone) and 5 kt and up, and leaves 3–4 kt open.

## [0.2.0] — 2026-11-07

IHO S-100 maritime weather and ice: S-412 marine weather warnings and S-411 ice charts, read from
S-100 data.

### Added

- **S-412 Marine Weather Warnings.** Wind, significant wave height, ice accretion, restricted
  visibility and thunderstorm warning areas join the catalog, one graphic per threshold, in the
  product's portrayal colors. They are listed under the new `MetocCategory.MarineWarnings`.
- **S-411 Ice Information.** Sea-ice areas in the WMO color codes, by total concentration and by
  stage of development, the iceberg area, the ice edge and ice limits, and the ridge, lead,
  fracture and crack lines, under the new `MetocCategory.IceCharts`. The six S-411 point features
  Appendix M has no symbol for (ice keel, grounded hummock, strips and patches, stage of melt with
  its code, ice lead and ice fracture) are drawn as S-411 draws them. The catalog now holds 408
  graphics.
- **The WMO egg code on sea-ice areas.** An S-411 area read from data carries its total and
  partial concentrations, stages of development and forms of ice, drawn in the WMO figures where
  the area holds them and hidden with the other labels.
- **`readS100Dataset`** reads S-411 or S-412 GML into METOC graphics. Ice symbols are read into
  the Appendix M symbols for them, and whatever cannot be drawn is listed with the reason
  (`S100ReadResult`, `S100Skipped`). Every S-100 attribute is kept on the saved graphic in the new
  `properties.metoc.s100`, by the product's attribute codes, for a host to show as the feature's
  report.
- **S-100 exchange sets and signatures.** `readS100ExchangeCatalogue` reads an exchange set's
  `CATALOG.XML` (edition 5 and the earlier layout), `readS100StandaloneSignature` reads
  `CATALOG.SIGN`, and `verifyS100Signature` and `verifyS100ExchangeSet` check S-100 Part 15
  signatures with Web Crypto (ECDSA-384-SHA2 and the earlier ECDSA, the signer issued by a
  trusted Scheme Administrator, both within their validity dates). Anything that cannot be
  verified is reported as unsupported, never as valid.
- **`MetocGraphicSpec.source` and `MetocGraphicSpec.s100`** (types `MetocSource` and
  `MetocS100Binding`): which product a graphic comes from when it is not MIL-STD-2525E, and the
  S-100 feature and attribute values it portrays. These graphics have no entity code and no SIDC.

### Changed

- **S-100 geometry is drawn exactly.** S-411 and S-412 graphics run straight between their points
  whatever `smoothLines` says, so a warning area keeps its published boundary.

## [0.1.1] — 2026-11-01

Drawing fixes from a review of every graphic against the standard's plates.

### Changed

- **Colors matched to the standard.** The isotach and magenta are `rgb(255, 0, 255)`, the color
  the standard prints as purple; every brown is the one brown it prints, `rgb(124, 96, 13)`
  (`DEFAULT_METOC_PALETTE`).
- **Icons redrawn to their plates**: freezing rain, the snow star, thunderstorm, dust devil, fog,
  icing, lighthouse, light vessel, fish weirs, eddies and others. Graphic names follow Table A-LI
  in full, and bottom-type abbreviations are set in italic serif.
- **Ice drift and sastrugi can always be turned.** Their names give them an orientation, so the
  editor offers the rotate handle whether or not `allowPointRotation` is on.

### Fixed

- **Wind barbs** (and the station plot's barb) put their feathers on the left looking downwind,
  as WMO and NWS read Table M-I.
- **Fronts and lines**: occluded and stationary fronts start with a triangle; frontolysis strokes
  lean as drawn; stationary front separators are colored as on the plate; the ridge axis is
  centered; instability, shear and convergence lines, the anchorage line, the anchorage area,
  current flood feathers, restricted area marks, the pipeline and the ITCZ rungs are drawn as the
  plates draw them.
- **Values and labels**: boxed values fit their box and turn with a turned symbol; heights are
  three digits; station pressure changes beyond 9.9 hPa are written; the date-time box sits
  inside the wind area; values too small to read on a point are left out.

### Removed

- **Tropical Storm Wind Area's value field**, which the standard does not document.

## [0.1.0] — 2026-10-30

The first public release: every MIL-STD-2525E Change 1, Appendix M graphic as GeoJSON, with
OpenLayers and MapLibre renderers and an editor, under the MIT license.

### Added

- **Every Appendix M graphic.** All 354 graphics of symbol sets 45 (Atmospheric) and 46
  (Oceanographic): fronts, pressure centers, isopleths, weather areas, the ITCZ band, and the
  point, line and area graphics of set 46, drawn as the standard's plates draw them, with every
  label the standard documents (heights, depths at the ends of and along depth lines, date-time
  groups). The catalog is `METOC_GRAPHICS`, `MetocGraphicName`, `MetocCategory`,
  `getMetocSpec`, `listMetocGraphics` and `getMetocDisplayName`.
- **The wind barb** from Table M-I's draw rule (`windDirection`, `windSpeed`): pennants, barbs
  and half barbs to the nearest 5 knots, the shaft to the nearest 10 degrees, calm and missing
  values, feathers mirrored in the southern hemisphere.
- **Station plots**: the WMO/NWS station model built around Appendix M's own symbols, with wind,
  sky cover, temperature, dew point, sea-level pressure, pressure change and tendency, and
  present weather.
- **SIDCs**: `metocSidc` and `metocGraphicFromSidc` convert between graphics and 2525E Change 1
  codes (`SIDC_VERSION_2525E_CHANGE_1`). The wind barb and the station plot have no entity code,
  so no SIDC is invented for them.
- **A saved object that is plain GeoJSON.** `metocFeature` builds one, `MetocCollection` holds
  them (`add`, `toGeoJSON`, `load`, change listeners, skipped features reported), and
  `validateMetocFeature` reports problems such as an area that crosses itself. Coordinates are
  `[lon, lat]`, and drawn points run continuously across the antimeridian (`continuousLonLat`,
  `wrapLongitude` and the other projection helpers).
- **Renderers**: `MetocOpenLayers` from `@zaes/metoc/openlayers` and `MetocMapLibre` from
  `@zaes/metoc/maplibre`, including MapLibre 3D, where point symbols stand on leader lines
  (`MetocPointLeader`). `ol` and `maplibre-gl` are optional peer dependencies; install the one
  you use.
- **Drawing without a map**: `paintMetocGraphic`, `paintMetocGraphicAsGeoJSON`,
  `renderMetocGraphic` and `metocThumbnailSvg` draw a graphic as marks, GeoJSON or an SVG
  thumbnail. The root entry imports no map library and no DOM, so it runs in a browser, a worker
  or Node.
- **The editor** (`@zaes/metoc/editor`): `MetocInteraction` draws and edits every graphic, with
  `attachMetocEditor` to bind it to either renderer, `MetocHistory` for undo and redo, and
  `getMetocFields` and `stationChoices` to tell a properties dialog which inputs a graphic
  offers. Points have a resize handle stepping through small, medium and large, and a rotate
  handle when `allowPointRotation` is on.
- **Configuration**: `configureMetoc` sets line width, pip size, smoothing, area fill opacity,
  point size (`POINT_SIZES`), label size, color, font, halo and visibility, the color palette,
  the default line color and the editor's handle, guide and selection colors. Numbers are
  clamped to `METOC_CONFIG_RANGES`, and `METOC_DARK_MAP` and `METOC_LIGHT_MAP` are presets for
  dark and light maps. One configuration is shared even when an app loads both the ES module and
  the CommonJS build.
- **Point symbols that shrink as the map zooms out**: `pointFullSizeScale` keeps them full size
  at that scale and closer in, then shrinks them, never below `pointMinScale`.
- **Smooth curves through every drawn point**, so a front passes through the points that were
  clicked (`smoothLines`).

[Unreleased]: https://github.com/zaes-code/metoc/tree/develop
[0.3.0]: https://www.npmjs.com/package/@zaes/metoc/v/0.3.0
[0.2.0]: https://www.npmjs.com/package/@zaes/metoc/v/0.2.0
[0.1.1]: https://www.npmjs.com/package/@zaes/metoc/v/0.1.1
[0.1.0]: https://www.npmjs.com/package/@zaes/metoc/v/0.1.0
