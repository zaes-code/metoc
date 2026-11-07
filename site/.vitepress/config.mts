import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {defineConfig, type DefaultTheme} from 'vitepress';

/**
 * The documentation site: hand-written guides, and an API reference TypeDoc generates into
 * `api/` from the source's own doc comments (`npm run docs:api`, which `docs:build` runs first).
 *
 * `DOCS_BASE` is the path the site is served under, `/` by default. Set it to wherever the
 * built folder is uploaded, such as `/docs/metoc/`.
 */
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../../packages/metoc/package.json', import.meta.url)), 'utf8'));
const sidebarFile = fileURLToPath(new URL('../api/typedoc-sidebar.json', import.meta.url));
const apiSidebar: DefaultTheme.SidebarItem[] = existsSync(sidebarFile) ? JSON.parse(readFileSync(sidebarFile, 'utf8')) : [];

const guide: DefaultTheme.SidebarItem[] = [
    {
        text: 'Guide',
        items: [
            {text: 'Introduction', link: '/guide/introduction'},
            {text: 'Getting started', link: '/guide/getting-started'},
            {text: 'The saved object', link: '/guide/saved-object'},
            {text: 'Rendering', link: '/guide/rendering'},
            {text: 'Drawing and editing', link: '/guide/editing'},
            {text: 'Wind barbs and station plots', link: '/guide/winds'},
            {text: 'Marine warnings and ice charts', link: '/guide/s100'},
            {text: 'Configuration', link: '/guide/configuration'},
            {text: 'Identifiers and validation', link: '/guide/sidc'},
            {text: 'The antimeridian', link: '/guide/antimeridian'},
        ],
    },
    {
        text: 'Reference',
        items: [
            {text: 'Graphics', link: '/guide/graphics'},
            {text: 'API', link: '/api/'},
        ],
    },
    {
        text: 'Project',
        items: [{text: 'About', link: '/about'}],
    },
];

export default defineConfig({
    title: 'METOC Graphics',
    description: pkg.description,
    base: process.env.DOCS_BASE ?? '/',
    head: [['meta', {name: 'theme-color', content: '#1f5fa8'}]],
    lang: 'en-US',
    // Plain `.html` links, so the site works as static files with no rewrite rule.
    cleanUrls: false,
    lastUpdated: false,
    themeConfig: {
        nav: [
            {text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/'},
            {text: 'API', link: '/api/', activeMatch: '/api/'},
            {text: 'Catalog', link: 'https://www.zaes.com/metoc-catalog'},
            {text: 'Live sample', link: 'https://zaes-code.github.io/metoc/'},
            {
                text: `v${pkg.version}`,
                items: [
                    {text: 'npm', link: 'https://www.npmjs.com/package/@zaes/metoc'},
                    {text: 'Product page', link: 'https://www.zaes.com/metoc'},
                ],
            },
        ],
        sidebar: {
            '/api/': [{text: 'API reference', items: apiSidebar}, ...guide],
            '/': guide,
        },
        outline: {level: [2, 3]},
        search: {provider: 'local'},
        socialLinks: [{icon: 'github', link: 'https://github.com/zaes-code/metoc'}],
        footer: {message: 'Released under the MIT License.', copyright: 'Copyright © Zaes'},
    },
});
