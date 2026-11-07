---
layout: home

hero:
  name: METOC Graphics
  text: MIL-STD-2525E weather and ocean graphics as plain GeoJSON
  tagline: Every graphic of Appendix M, symbol sets 45 and 46, on OpenLayers or MapLibre, with an editor that works on either.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: API reference
      link: /api/
    - theme: alt
      text: Live sample
      link: https://zaes-code.github.io/metoc/

features:
  - title: GeoJSON in, GeoJSON out
    details: A graphic is one feature with its drawn points and properties.metoc. Nothing about the view travels with it, and the root entry needs no map library or DOM.
    link: /guide/saved-object
  - title: Two renderers, one paint layer
    details: OpenLayers and MapLibre draw from the same symbology code, flat or tilted over terrain, with screen-sized decoration at every zoom.
    link: /guide/rendering
  - title: One editor for every engine
    details: Draw, reshape, move, nudge, duplicate, undo and redo. The gestures live once and attach to any renderer through one seam.
    link: /guide/editing
  - title: Every Appendix M graphic
    details: Fronts, pressure centres, isopleths, areas of weather, ice, depth, ports, navigation aids and mine warfare, in the standard's colours.
    link: /guide/graphics
  - title: Marine warnings and ice charts
    details: IHO S-412 marine weather warnings and S-411 ice charts, read from S-100 GML with their attributes and the WMO egg code, and exchange-set signatures verified.
    link: /guide/s100
---
