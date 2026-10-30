#!/usr/bin/env node
/**
 * Copies MapLibre's worker bundle into public/ so the demo can serve it, and the demo points
 * MapLibre at it with setWorkerUrl. maplibre-gl v6 finds its worker from import.meta.url, which a
 * bundler's dependency pre-bundling breaks; the symptom is silent — basemap tiles draw (raster is
 * decoded on the main thread) while no GeoJSON source ever parses.
 *
 * Both files are needed: the worker opens with `import ... from "./maplibre-gl-shared.mjs"`, and a
 * dev server answers a missing sibling with index.html and a 200, so the worker dies quietly.
 * The copies are gitignored build artefacts.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'node_modules', 'maplibre-gl', 'dist');
const publicDir = path.join(root, 'public');
const FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

if (!fs.existsSync(dist)) {
    console.log('maplibre-gl not installed — skipping worker copy');
    process.exit(0);
}
fs.mkdirSync(publicDir, {recursive: true});
for (const file of FILES) {
    const source = path.join(dist, file);
    if (!fs.existsSync(source)) throw new Error(`maplibre-gl is installed but dist/${file} is missing`);
    fs.copyFileSync(source, path.join(publicDir, file));
    console.log(`copied ${file} → public/`);
}
