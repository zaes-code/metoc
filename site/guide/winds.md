# Wind barbs and station plots

## The wind barb

A wind barb is data first: a `Point` with `windDirection` (degrees true, the direction the wind
blows **from**) and `windSpeed` (knots). Observations plot directly, with nothing drawn by hand.

```ts
metocFeature(MetocGraphicName.WindBarb, [[-97.5, 35.4]], {windDirection: 270, windSpeed: 65});
```

- The direction is drawn to the nearest 10°, and the speed with Table M-I's half barbs (5 kt),
  barbs (10 kt) and pennants (50 kt).
- **No speed** draws an X at the end of the shaft. **No direction** draws the plot circle only, as
  Table M-I says such a wind "is not displayed"; `validateMetocFeature` reports it.
- Barbs go on the left of the shaft north of the equator and on the right south of it, read from
  the station's own latitude, as the WMO and NWS station model draws them.
- The wind barb has **no SIDC**: 2525E keeps its draw rule in Table M-I but lists no entity for it,
  so `metocSidc` returns `undefined` rather than a code another system could not read back.

## The station plot

`MetocGraphicName.StationPlot` lays Appendix M's own symbols around one station, as the WMO and NWS
station model does. It is a `Point` with the barb's wind plus:

| Property | Drawn |
|---|---|
| `cloudCover` | A cloud coverage symbol's name, as the plot circle (empty when missing) |
| `temperature` | Upper left |
| `dewPoint` | Lower left |
| `weather` | A weather or storm symbol's name, left of the circle |
| `pressure` | Sea-level pressure in hPa, upper right in three digits (1013.2 → 132) |
| `pressureChange` | In tenths of hPa, right of the circle (1.9 → 19) |
| `pressureTendency` | A pressure tendency symbol's name, after the change; it carries the sign |

```ts
metocFeature(MetocGraphicName.StationPlot, [[-77.4, 38.9]], {
    windDirection: 320, windSpeed: 15,
    cloudCover: MetocGraphicName.CloudScattered,
    temperature: 18, dewPoint: 9,
    pressure: 1016.4, pressureChange: 1.2,
});
```

Anything missing is left out. Like the barb, a station plot has no SIDC. `stationChoices()` in
`@zaes/metoc/editor` lists the symbols each picker should offer.
