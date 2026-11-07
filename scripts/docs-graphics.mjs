#!/usr/bin/env node
/**
 * Writes the docs site's graphics reference, `site/guide/graphics.md`, and one thumbnail per graphic
 * into `site/public/graphics/`, from the built package, so the list can never disagree with the
 * catalog. Run `npm run build` first.
 */
import {existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const entry = `${root}packages/metoc/dist/esm/index.js`;
if (!existsSync(entry)) {
    console.error('docs-graphics: packages/metoc/dist is missing. Run `npm run build` first.');
    process.exit(1);
}
const metoc = await import(pathToFileURL(entry).href);
const {listMetocGraphics, getMetocSpec, getMetocDisplayName, metocSidc, metocThumbnailSvg} = metoc;

const thumbDir = `${root}site/public/graphics`;
rmSync(thumbDir, {recursive: true, force: true});
mkdirSync(thumbDir, {recursive: true});

const names = listMetocGraphics();
const bySet = {45: new Map(), 46: new Map()};
for (const name of names) {
    const spec = getMetocSpec(name);
    const groups = bySet[spec.symbolSet];
    if (!groups.has(spec.category)) groups.set(spec.category, []);
    groups.get(spec.category).push(spec);
    writeFileSync(`${thumbDir}/${name}.svg`, metocThumbnailSvg(name, {width: 120, height: 40}));
}

const coded = names.filter((n) => getMetocSpec(n).entityCode !== null).length;
const geometry = {point: 'Point', line: 'Line', area: 'Area'};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const out = [
    '# Graphics',
    '',
    `The catalog holds ${names.length} graphics: the ${coded} that MIL-STD-2525E Change 1, Appendix M draws in symbol sets 45 (Atmospheric) and 46 (Oceanographic), each with its entity code, plus the wind barb (Table M-I's draw rule) and the station plot, which have none. Each row is generated from the package itself, and each thumbnail is drawn by \`metocThumbnailSvg\`, the same paint layer the map uses.`,
    '',
    'The [visual catalog](https://www.zaes.com/metoc-catalog) shows them larger, with search.',
    '',
];
const sets = {45: 'Symbol set 45: Atmospheric', 46: 'Symbol set 46: Oceanographic'};
for (const set of [45, 46]) {
    out.push(`## ${sets[set]}`, '');
    for (const [category, specs] of bySet[set]) {
        out.push(`### ${category} {#s${set}-${slug(category)}}`, '', '| | Graphic | Name | Entity | Geometry | SIDC |', '|---|---|---|---|---|---|');
        for (const s of specs) {
            const sidc = metocSidc(s.name);
            const img = `<img src="/graphics/${s.name}.svg" alt="" width="120" height="40" loading="lazy" style="background:#fff;border-radius:4px;max-width:none">`;
            out.push(`| ${img} | ${getMetocDisplayName(s.name)} | \`${s.name}\` | ${s.entityCode ?? '—'} | ${geometry[s.geometry] ?? s.geometry} | ${sidc ? `\`${sidc}\`` : 'none'} |`);
        }
        out.push('');
    }
}
writeFileSync(`${root}site/guide/graphics.md`, out.join('\n'));
console.log(`docs-graphics: ${names.length} graphics`);
