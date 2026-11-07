# Identifiers and validation

## The catalog

```ts
import {listMetocGraphics, getMetocSpec, getMetocDisplayName, isMetocGraphicName, MetocGraphicName} from '@zaes/metoc';

listMetocGraphics();                                  // every name, in catalog order
getMetocSpec(MetocGraphicName.WarmFront);             // its set, entity code, draw rule, geometry, colours
getMetocDisplayName(MetocGraphicName.WarmFront);      // 'Warm Front'
isMetocGraphicName('WarmFront');                      // true
```

`MetocGraphicName` is a constant object and a union type of the same names, so a name is a plain
string in saved GeoJSON.

## SIDCs

```ts
import {metocSidc, metocGraphicFromSidc, metocGraphicByEntityCode} from '@zaes/metoc';

metocSidc(MetocGraphicName.ColdFront);            // '150045000011030100000000000000'
metocGraphicFromSidc('150045000011030100000000000000');   // 'ColdFront'
metocGraphicByEntityCode('110301', 45);           // 'ColdFront'
```

- `metocSidc` builds the 30-digit 2525E Change 1 code: version `15`, identity `00` (identity does
  not apply to METOC), the symbol set, the entity code.
- `metocGraphicFromSidc` reads the 20-digit 2525D form and the 30-digit 2525E form, any version, and
  ignores the identity and modifier positions.
- Sets 45 and 46 reuse entity codes, so look a code up **with its set**.
- The wind barb and the station plot have no SIDC: `metocSidc` returns `undefined`.

## Validation

```ts
import {validateMetocFeature} from '@zaes/metoc';

validateMetocFeature(feature);   // [] or a list of problems
```

It reports what a renderer can still draw but an operator should hear about: too few points, an
area whose outline crosses itself, a wind barb with no direction. The editor refuses to finish a
self-crossing area; this catches one an edit or a file brings in.
