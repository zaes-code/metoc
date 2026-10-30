import {defineConfig} from 'vitest/config';
import type {PluginOption} from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const pkg = (p: string) => fileURLToPath(new URL(`./packages/${p}`, import.meta.url));
/**
 * The engine's packages: from source when the sibling checkout `../symbology-engine` is there (as
 * package.json links it); otherwise, as in a clone of the published repository, the installed
 * packages from npm, which resolve without an alias.
 */
const engine = (p: string) => fileURLToPath(new URL(`../symbology-engine/packages/${p}`, import.meta.url));
const engineSource = fs.existsSync(engine('engine/src/index.ts'));

// The demo imports the library by its published names. These are anchored regexes: a plain
// `{name: path}` alias is a prefix match and would send `@zaes/metoc/openlayers` to
// `index.ts/openlayers`. tsconfig.json `paths` states the same mapping for the compiler.
const alias = [
    ...(engineSource
        ? [
              {find: /^@zaes\/symbology-engine$/, replacement: engine('engine/src/index.ts')},
              {find: /^@zaes\/symbology-engine\/openlayers$/, replacement: engine('engine/src/openlayers/index.ts')},
              {find: /^@zaes\/symbology-engine\/maplibre$/, replacement: engine('engine/src/maplibre/index.ts')},
              {find: /^@zaes\/symbology-editor$/, replacement: engine('engine-editor/src/index.ts')},
          ]
        : []),
    {find: /^@zaes\/metoc$/, replacement: pkg('metoc/src/index.ts')},
    {find: /^@zaes\/metoc\/openlayers$/, replacement: pkg('metoc/src/openlayers/index.ts')},
    {find: /^@zaes\/metoc\/maplibre$/, replacement: pkg('metoc/src/maplibre/index.ts')},
    {find: /^@zaes\/metoc\/editor$/, replacement: pkg('metoc/src/editor/index.ts')},
];

/**
 * The same mapping as a resolver that runs before everything else. The alias alone is not enough:
 * a long-running dev server that restarted itself on a config change was seen resolving
 * `@zaes/metoc` through the package's own `exports` to `dist/` — so the demo ran the last *build*,
 * not the source, and every check against it passed until the build went stale. A `pre` plugin
 * answers first, every time. `npm run drive` also fails if the page loads anything from `dist/`.
 */
const sourceFirst = {
    name: 'metoc-source-first',
    enforce: 'pre' as const,
    resolveId(id: string) {
        return alias.find((a) => a.find.test(id))?.replacement ?? null;
    },
};

/**
 * # The sample page's add-on slot (`src/demo/addonTypes.ts`)
 *
 * `npm run start:addons` runs Vite in `addons` mode, which loads the Vite plugins named in the
 * untracked `demo-addons.local.json` (`{"plugins": ["<path to an add-on's Vite plugin>"]}`). Each
 * names its entry module as `demoAddonEntry`, and `@demo/addons` joins every entry's engines and
 * tools. In every other mode `@demo/addons` is `src/demo/addonsNone.ts`, the empty lists, and a
 * build in `addons` mode is refused, so no add-on reaches a deployable bundle.
 */
const ADDONS_MODE = 'addons';
const ADDONS_FILE = fileURLToPath(new URL('./demo-addons.local.json', import.meta.url));
const NO_ADDONS = fileURLToPath(new URL('./src/demo/addonsNone.ts', import.meta.url));

type AddonPlugin = PluginOption & {demoAddonEntry?: string};

/** `@demo/addons` as one module joining every add-on entry's engines and tools, or the empty one. */
function addonSlot(entries: string[] | null): PluginOption {
    const id = '\0demo-addons';
    return {
        name: 'metoc-demo-addon-slot',
        enforce: 'pre',
        resolveId: (source: string) => (source === '@demo/addons' ? (entries ? id : NO_ADDONS) : undefined),
        load(loaded: string) {
            if (loaded !== id || !entries) return undefined;
            const imports = entries.map((entry, i) => `import * as addon${i} from ${JSON.stringify(entry.split('\\').join('/'))};`);
            const join = (list: string) => `[${entries.map((_, i) => `...(addon${i}.${list} ?? [])`).join(', ')}]`;
            return [...imports, `export const demoAddons = ${join('demoAddons')};`, `export const demoTools = ${join('demoTools')};`].join('\n');
        },
    };
}

async function addonPlugins(): Promise<{plugins: PluginOption[]; entries: string[]}> {
    if (!fs.existsSync(ADDONS_FILE)) throw new Error('addons mode needs demo-addons.local.json: {"plugins": ["<path to an add-on\'s Vite plugin>"]}');
    const {plugins = []} = JSON.parse(fs.readFileSync(ADDONS_FILE, 'utf8')) as {plugins?: string[]};
    const here = fileURLToPath(new URL('.', import.meta.url));
    const loaded = await Promise.all(
        plugins.map(async (p) => {
            const module = await import(pathToFileURL(path.resolve(here, p)).href);
            return (module.default ?? module.plugin)() as AddonPlugin;
        }),
    );
    const entries = loaded.flatMap((p) => {
        const entry = p && typeof p === 'object' && 'demoAddonEntry' in p ? p.demoAddonEntry : undefined;
        return entry ? [entry] : [];
    });
    return {plugins: [addonSlot(entries), ...loaded], entries};
}

export default defineConfig(async ({command, mode}) => {
    const addons = mode === ADDONS_MODE;
    // A build is what gets published, and the published sample never carries an add-on.
    if (addons && command === 'build') throw new Error('addons mode is for the dev server only; it never builds');
    const slot = addons ? await addonPlugins() : undefined;
    return {
        base: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL.replace(/\/$/, '')}/` : '/',
        plugins: [sourceFirst, ...(slot?.plugins ?? [addonSlot(null)])],
        // One copy of each map library: the engine's source sits in the sibling checkout, whose own
        // node_modules would otherwise hand it a second OpenLayers, and a layer from one copy cannot
        // be added to a map from the other.
        resolve: {alias, dedupe: ['ol', 'maplibre-gl']},
        server: {port: 3100},
        // The dependency scan crawls from index.html and cannot see through the virtual
        // `@demo/addons`, so an add-on's own dependencies are named here by its entry; found only
        // on first use, their pre-bundle reloaded the page mid-session.
        optimizeDeps: slot ? {entries: ['index.html', ...slot.entries.map((e) => e.split('\\').join('/'))]} : undefined,
        // Load-bearing: Vite's default outDir is dist/, which is the published library.
        // The sample page and the display-only viewer; sheet.html is a development tool and not built.
        build: {
            outDir: 'build',
            emptyOutDir: true,
            rollupOptions: {input: {main: fileURLToPath(new URL('./index.html', import.meta.url)), viewer: fileURLToPath(new URL('./viewer.html', import.meta.url))}},
        },
        test: {
            globals: true,
            environment: 'node',
            alias,
            include: ['packages/*/src/**/*.test.ts', 'src/**/*.test.ts'],
        },
    };
});
