#!/usr/bin/env node
/**
 * Checks the built sample (`build/`, from `npm run build:demo`): the page and the viewer are there,
 * and the add-on slot is the empty one. A build never loads an add-on (`src/demo/addonTypes.ts`;
 * `vite.config.mts` refuses), and this proves it of the output.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const build = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'build');
const fail = (msg) => {
    console.error(`\nSAMPLE BUILD CHECK FAILED: ${msg}`);
    process.exit(1);
};
if (!fs.existsSync(build)) fail('build/ is missing: run `vite build` first');

const FORBIDDEN = [
    // The slot joining add-on entries exists only in `addons` mode.
    /demo-addons\.local|demoAddonEntry|@metoc-demo\//,
];
const files = fs.readdirSync(build, {recursive: true}).map(String).filter((f) => /\.(html|js|css|json|map)$/.test(f));
for (const page of ['index.html', 'viewer.html']) if (!files.includes(page)) fail(`build/${page} is missing`);
for (const f of files) {
    const text = fs.readFileSync(path.join(build, f), 'utf8');
    for (const re of FORBIDDEN) {
        const m = re.exec(text);
        if (m) fail(`${f} has "${m[0]}" (…${text.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ')}…)`);
    }
}
console.log(`ok  the built sample is the library alone (${files.length} files checked)`);
