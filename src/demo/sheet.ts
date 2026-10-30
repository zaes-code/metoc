/**
 * A development sheet: the thumbnails of the graphics a query names, large, with their codes, for
 * checking icons against the standard's drawings. `?set=46&code=1201` filters by symbol set and
 * code prefix; `?names=A,B` picks names. Not published, not linked from the demo.
 */

import {getMetocSpec, listMetocGraphics, metocThumbnailSvg} from '@zaes/metoc';

const q = new URLSearchParams(location.search);
const set = q.get('set');
const code = q.get('code') ?? '';
const names = q.get('names')?.split(',');
const grid = document.querySelector('#grid') as HTMLElement;
for (const n of listMetocGraphics()) {
    const s = getMetocSpec(n);
    if (names && !names.includes(n)) continue;
    if (set && String(s.symbolSet) !== set) continue;
    if (code && !(s.entityCode ?? '').startsWith(code)) continue;
    const cell = document.createElement('div');
    cell.className = 'cell';
    const value = s.valueField?.placeholder;
    cell.innerHTML = metocThumbnailSvg(n, {width: 188, height: 90, scale: 1.6, value}) + `<div class="code">${s.symbolSet} ${s.entityCode ?? '—'}</div><div>${s.displayName}</div>`;
    grid.append(cell);
}
(window as unknown as {__sheetReady: boolean}).__sheetReady = true;
