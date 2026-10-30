#!/usr/bin/env node
/**
 * The boundary gate, run on source. `typecheck` and the tests both pass with a deep import in
 * place — the path resolves and neither tool has an opinion — so this states the rules once.
 *
 * 1. `@zaes/metoc` (packages/metoc) imports the engine only, by its published entries. Its root
 *    (`src/` outside the renderers and the editor) imports no map library and only the engine's
 *    root. `src/openlayers/` never reaches MapLibre, and `src/maplibre/` never reaches OpenLayers or
 *    imports `maplibre-gl` at run time; each may use the engine's renderer of its own kind.
 * 2. `src/editor/` (`@zaes/metoc/editor`) imports its package's root by relative path (never a
 *    renderer), the engine's editor `@zaes/symbology-editor`, and no map library: it edits through
 *    the map-host seam, so it works on every engine.
 * 3. Nothing names a deep path such as `@zaes/metoc/core/...`: a deep import means a barrel is
 *    missing an export. The demo reaches the engine only through `@zaes/metoc`.
 * 4. The demo imports the package by name, and its add-ons only through the `@demo/addons` slot.
 *    The display-only viewer (`src/demo/viewer.ts`) imports the root and the OpenLayers renderer.
 * 5. Nothing published reads `document`, `window` or `process` at module scope.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, {recursive: true}).filter((f) => f.endsWith('.ts')).map((f) => path.join(dir, f)) : []);
const importsOf = (text) => [...text.matchAll(/^\s*(?:import|export)\s+(type\s+)?[^'";]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => ({typeOnly: !!m[1], spec: m[2]}));
const isOl = (s) => s === 'ol' || s.startsWith('ol/');
const isMapLibre = (s) => s === 'maplibre-gl' || s.startsWith('maplibre-gl/');
const isOurs = (s) => s.startsWith('@zaes/');
const ENGINE = ['@zaes/symbology-engine', '@zaes/symbology-engine/openlayers', '@zaes/symbology-engine/maplibre'];
const ENGINE_EDITOR = '@zaes/symbology-editor';
const PUBLISHED = new Set([...ENGINE, ENGINE_EDITOR, '@zaes/metoc', '@zaes/metoc/openlayers', '@zaes/metoc/maplibre', '@zaes/metoc/editor']);

/** Which part of the workspace a file is in: `core`, `openlayers`, `maplibre`, `editor` or `demo`. */
function areaOf(rel) {
    const parts = rel.split('/');
    if (parts[0] === 'src') return parts[1] === 'demo' ? 'demo' : null;
    if (parts[0] === 'packages' && parts[1] === 'metoc') return ['openlayers', 'maplibre', 'editor'].includes(parts[3]) ? parts[3] : 'core';
    return null;
}

const files = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'packages', 'metoc', 'src'))];

for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const area = areaOf(rel);
    if (!area) continue;
    const text = fs.readFileSync(file, 'utf8');
    const isTest = rel.endsWith('.test.ts');
    const bad = (why) => problems.push(`${rel}: ${why}`);
    for (const {typeOnly, spec} of importsOf(text)) {
        const target = spec.startsWith('.') ? areaOf(path.relative(root, path.resolve(path.dirname(file), spec)).replace(/\\/g, '/')) : null;
        if (isOurs(spec) && !PUBLISHED.has(spec)) bad(`imports ${spec}: a deep import, or a package this repository does not have`);
        const rootOfMine = target === 'core' && ['openlayers', 'maplibre', 'editor'].includes(area);
        if (spec.startsWith('.') && target !== area && !rootOfMine) bad(`reaches into ${target ?? 'another area'} by path (${spec})`);
        if (spec === ENGINE_EDITOR && area !== 'editor') bad(`imports ${spec}; only @zaes/metoc/editor binds the engine's editor`);
        if (ENGINE.includes(spec) && !['core', 'openlayers', 'maplibre'].includes(area)) bad(`imports ${spec}; only @zaes/metoc uses the engine directly — import it from @zaes/metoc`);
        switch (area) {
            case 'core':
                if (isOl(spec) || isMapLibre(spec)) bad(`the root imports ${spec}`);
                if (isOurs(spec) && spec !== ENGINE[0]) bad(`the root imports ${spec}`);
                break;
            case 'openlayers':
                if (isMapLibre(spec)) bad(`imports ${spec}`);
                if (isOurs(spec) && spec !== '@zaes/symbology-engine/openlayers') bad(`imports ${spec}`);
                break;
            case 'maplibre':
                if (isOl(spec)) bad(`imports ${spec}`);
                if (isOurs(spec) && spec !== '@zaes/symbology-engine/maplibre') bad(`imports ${spec}`);
                if (isMapLibre(spec) && !typeOnly) bad('imports maplibre-gl at run time; use `import type`');
                break;
            case 'editor':
                if (isOl(spec) || isMapLibre(spec)) bad(`the editor imports ${spec}; it edits through MetocMapHost`);
                if (isOurs(spec) && spec !== ENGINE_EDITOR) bad(`the editor imports ${spec}; it reaches the root by relative path`);
                break;
            case 'demo':
                if (rel === 'src/demo/viewer.ts' && isOurs(spec) && !['@zaes/metoc', '@zaes/metoc/openlayers'].includes(spec)) bad(`the display-only viewer imports ${spec}`);
                break;
        }
    }
    if (area !== 'demo' && !isTest) {
        text.split('\n').forEach((line, i) => {
            if (/^(const|let|var|export const|export let)\b.*\b(document|window|process)\b/.test(line) || /^(document|window|process)\./.test(line)) {
                problems.push(`${rel}:${i + 1}: reads a global at module load`);
            }
        });
    }
}

if (problems.length) {
    console.error('Layering violations:\n' + problems.map((p) => `  ${p}`).join('\n'));
    process.exit(1);
}
console.log(`Layering ok (${files.length} files).`);
