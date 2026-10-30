#!/usr/bin/env node
/**
 * Builds `@zaes/metoc` into packages/metoc/dist/. The engine's packages are the sibling checkout's
 * (`../symbology-engine`, linked in package.json), and METOC compiles against *their* dist/: build
 * that repository first (`npm run build` there).
 *
 *   @zaes/metoc          packages/metoc/dist/{esm,cjs,types}/            (+ openlayers/, maplibre/, editor/)
 *
 * The renderers and the editor import the root by relative path, so a consumer who imports the
 * root and a renderer gets one module instance — one configuration, one palette. `@zaes/metoc`
 * depends on the engine by its published entries, and only the METOC renderers reach the engine's
 * renderers.
 *
 * Then it asserts what a passing build cannot show by itself:
 *
 * 1. Each built file imports only what its entry allows (the same rules as check:layering, on the
 *    output): no map library in the root or the editor, only its own in each renderer.
 * 2. Nothing published reads `process`, `document` or `window` at module load. A Node smoke test
 *    cannot catch them, because Node has `process` and the tests never had a DOM to miss. Every
 *    entry is imported in a child Node with `process` gone.
 * 3. Both module formats load, and every entry has declarations.
 * 4. An application that loads `@zaes/metoc` both ways — its ES module and its CommonJS build —
 *    has one configuration: a setting made through one is read through the other.
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');

const isOl = (s) => s === 'ol' || s.startsWith('ol/');
const isMapLibre = (s) => s === 'maplibre-gl' || s.startsWith('maplibre-gl/');
const isCesium = (s) => s === 'cesium' || s.startsWith('cesium/') || s.startsWith('@cesium/');

/** Each package, its entries (subpaths of dist/<format>/), and what a built file in an entry may import. */
const ENGINE = '@zaes/symbology-engine';
const PACKAGES = [
    {
        dir: 'metoc',
        entries: {
            '': (s) => !isOl(s) && !isMapLibre(s) && !isCesium(s) && (!s.startsWith('@zaes/') || s === ENGINE),
            openlayers: (s) => !isMapLibre(s) && !isCesium(s) && (!s.startsWith('@zaes/') || s === `${ENGINE}/openlayers`),
            maplibre: (s) => !isOl(s) && !isMapLibre(s) && !isCesium(s) && (!s.startsWith('@zaes/') || s === `${ENGINE}/maplibre`),
            editor: (s) => !isOl(s) && !isMapLibre(s) && !isCesium(s) && (!s.startsWith('@zaes/') || s === '@zaes/symbology-editor'),
        },
    },
];

const fail = (msg) => {
    console.error(`\nBUILD ASSERTION FAILED: ${msg}`);
    process.exit(1);
};
const files = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, {recursive: true}).filter((f) => f.endsWith('.js')).map((f) => path.join(dir, f)) : []);
// Comments are stripped first: a usage example in a doc comment is not an import.
const code = (file) => fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const importsOf = (file) => [...code(file).matchAll(/(?:from\s+|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g)].map((m) => m[1]);
const fileUrl = (p) => 'file:///' + p.replace(/\\/g, '/').replace(/^\//, '');

// The engine from the sibling checkout, built there first; or, without one, the installed packages.
for (const [name, dir] of Object.entries({'@zaes/symbology-engine': 'engine', '@zaes/symbology-editor': 'engine-editor'})) {
    const sibling = path.join(root, '..', 'symbology-engine', 'packages', dir);
    const types = fs.existsSync(sibling) ? path.join(sibling, 'dist', 'types', 'index.d.ts') : path.join(root, 'node_modules', ...name.split('/'), 'dist', 'types', 'index.d.ts');
    if (!fs.existsSync(types)) fail(`${name} is not built: run \`npm run build\` in ../symbology-engine first, or npm install (${types} is missing)`);
}

for (const pkg of PACKAGES) {
    const cwd = path.join(root, 'packages', pkg.dir);
    const dist = path.join(cwd, 'dist');
    const name = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')).name;
    const run = (...args) => execFileSync(process.execPath, [tsc, ...args], {cwd, stdio: 'inherit'});
    console.log(`\n${name}`);
    fs.rmSync(dist, {recursive: true, force: true});

    console.log('  ES modules');
    run('-p', 'tsconfig.lib.json', '--module', 'esnext', '--moduleResolution', 'bundler', '--outDir', 'dist/esm', '--declaration', 'false', '--declarationMap', 'false');
    fs.writeFileSync(path.join(dist, 'esm', 'package.json'), JSON.stringify({type: 'module'}, null, 2) + '\n');
    console.log('  CommonJS and declarations');
    run('-p', 'tsconfig.lib.json', '--module', 'commonjs', '--moduleResolution', 'node10', '--outDir', 'dist/cjs', '--declarationDir', 'dist/types');

    // 1. Imports, per entry. The root entry's files are those outside the renderer folders.
    const subEntries = Object.keys(pkg.entries).filter(Boolean);
    for (const format of ['esm', 'cjs']) {
        for (const [entry, allowed] of Object.entries(pkg.entries)) {
            const dir = path.join(dist, format, entry);
            const list = files(dir).filter((f) => entry || !subEntries.some((s) => path.relative(dir, f).startsWith(s + path.sep)));
            if (list.length === 0) fail(`${name}: dist/${format}/${entry} is empty`);
            for (const f of list) {
                for (const spec of importsOf(f)) {
                    if (spec.startsWith('.')) {
                        if (spec.includes('demo')) fail(`${path.relative(root, f)} imports the demo (${spec})`);
                        continue;
                    }
                    if (spec === 'tslib') continue;
                    if (!allowed(spec)) fail(`${path.relative(root, f)} imports ${spec}, which its tier may not`);
                }
            }
        }
    }
    console.log('  ok  each entry imports only what its tier allows');

    // 2. Every ESM entry imports with no process, document or window.
    const urls = Object.keys(pkg.entries).map((e) => fileUrl(path.join(dist, 'esm', e, 'index.js')));
    const probe = `
        delete globalThis.process;
        const results = [];
        for (const url of ${JSON.stringify(urls)}) {
            try { await import(url); results.push('ok'); } catch (e) { results.push(url + ': ' + (e && e.message)); }
        }
        console.log(JSON.stringify(results));
    `;
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', probe], {cwd, encoding: 'utf8'}).trim().split('\n').pop();
    for (const r of JSON.parse(out)) if (r !== 'ok') fail(`importing ${r} with no process/document/window — something reads a global at module load`);
    console.log(`  ok  every ESM entry imports with no process, document or window`);

    // 3. CommonJS loads, and declarations exist.
    const cjs = execFileSync(process.execPath, ['-e', `console.log(Object.keys(require('./dist/cjs/index.js')).length)`], {cwd, encoding: 'utf8'}).trim();
    if (!(Number(cjs) > 0)) fail(`${name}: the CommonJS entry exported ${cjs} names`);
    for (const entry of Object.keys(pkg.entries)) if (!fs.existsSync(path.join(dist, 'types', entry, 'index.d.ts'))) fail(`${name}: dist/types/${entry}/index.d.ts is missing`);
    console.log(`  ok  CommonJS loads (${cjs} exports) and every entry has declarations`);

    // 4. One configuration across both module formats.
    if (pkg.dir === 'metoc') {
        const dual = `
            import {createRequire} from 'node:module';
            const esm = await import('./dist/esm/index.js');
            const cjs = createRequire(import.meta.url)('./dist/cjs/index.js');
            esm.configureMetoc({lineWidth: 5});
            console.log(esm.configureMetoc !== cjs.configureMetoc && cjs.getMetocConfig().lineWidth === 5);
        `;
        const shared = execFileSync(process.execPath, ['--input-type=module', '-e', dual], {cwd, encoding: 'utf8'}).trim();
        if (shared !== 'true') fail(`${name}: its ES module and CommonJS builds keep separate configurations`);
        console.log('  ok  its ES module and CommonJS builds share one configuration');
    }
}
console.log('\nBuilt @zaes/metoc.');
