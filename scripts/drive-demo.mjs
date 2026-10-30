#!/usr/bin/env node
/**
 * Drives the sample page in a real browser, on both engines, and asserts on state rather than
 * pixels: the collection, the editor, and what each engine actually holds. Screenshots land in
 * .playwright-out/ as corroboration, not as the assertion.
 *
 *   npm start            # terminal 1
 *   npm run drive        # terminal 2   (add -- --headed to watch)
 *
 * Uses window.__metoc, installed by the demo in development only. No app code reads it.
 */
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const URL = process.env.METOC_URL ?? 'http://localhost:3100/';
const headed = process.argv.includes('--headed');
const outDir = path.resolve('.playwright-out');
fs.mkdirSync(outDir, {recursive: true});

let failures = 0;
const check = (ok, msg) => {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${msg}`);
    if (!ok) failures++;
};

// Playwright's own Chromium if it has been downloaded (`npx playwright install chromium`), else the
// installed Microsoft Edge, so a fresh clone can drive the page without a download.
const browser = await chromium.launch({headless: !headed}).catch(() => chromium.launch({headless: !headed, channel: 'msedge'}));
const page = await browser.newPage({viewport: {width: 1400, height: 900}});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text()));
// The demo must run the source. A dev server that resolves the package names through
// package.json "exports" serves dist/ instead, and every check below would pass against a build.
page.on('request', (r) => /^\/(packages\/[^/]+\/)?dist\//.test(new globalThis.URL(r.url()).pathname) && errors.push(`the page loaded the build, not the source: ${r.url()}`));
page.on('response', (r) => r.status() >= 400 && !r.url().includes('tile.openstreetmap.org') && errors.push(`${r.status()} ${r.url()}`));

await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForFunction(() => !!window.__metoc);

// Every engine the page offers: its own, and an add-on's when it runs with them (npm run start:addons).
const offered = await page.$$eval('.engine button[data-engine]', (bs) => bs.map((b) => b.dataset.engine));
const flat = offered.filter((e) => e !== 'maplibre3d');
const tilting = offered.filter((e) => e !== 'openlayers' && e !== 'maplibre');
console.log(`engines: ${offered.join(', ')}`);
/** How long an engine takes to settle; an add-on engine is given the longest. */
const settle = (engine) => ({openlayers: 800, maplibre: 2500, maplibre3d: 2500})[engine] ?? 3000;

for (const engine of flat) {
    console.log(`\n${engine}`);
    await page.click(`.engine button[data-engine="${engine}"]`);
    // An add-on engine is loaded on first use, and may need time for its globe.
    await page.waitForFunction((e) => window.__metoc.engine()?.name === e, engine, {timeout: 60000});
    await page.waitForTimeout(settle(engine));

    await page.click('#gallery');
    await page.waitForTimeout(1200);
    const [size, want] = await page.evaluate(() => {
        const opt = document.querySelector('#gallery-group').selectedOptions[0];
        return [window.__metoc.collection.size, Number(opt.textContent.match(/\((\d+)\)/)[1])];
    });
    check(size === want && size > 0, `sample gallery draws every graphic of the selected group (${size} of ${want})`);

    // The ready-made scenario, first in the list: a surface analysis, framed.
    if (engine === 'openlayers') {
        await page.selectOption('#gallery-group', 'scenario:surface-analysis');
        await page.click('#gallery');
        await page.waitForFunction(() => window.__metoc.collection.size === 12 && window.__metoc.engine()?.name === 'openlayers', null, {timeout: 15000});
        await page.waitForTimeout(800);
        const names = await page.evaluate(() => new Set(window.__metoc.collection.list().map((f) => f.properties.metoc.name)).size);
        check(names === 10, `the scenario opens the surface analysis: 12 graphics, 10 kinds (${names})`);
        await page.screenshot({path: path.join(outDir, 'scenario-surface-analysis.png')});
    }

    // Every gallery group, on this engine: each must draw with no page error.
    const groups = await page.evaluate(() => [...document.querySelectorAll('#gallery-group option')].map((o) => o.value).filter((v) => !v.startsWith('scenario:')));
    let groupTotal = 0;
    for (const grp of groups) {
        await page.selectOption('#gallery-group', grp);
        await page.click('#gallery');
        await page.waitForTimeout(150);
        groupTotal += await page.evaluate(() => window.__metoc.collection.size);
    }
    const total = await page.evaluate(() => document.querySelectorAll('.tile').length);
    check(groupTotal === total, `every gallery group draws, ${groupTotal} graphics in all (${total} in the picker)`);
    if (engine === 'openlayers') await page.screenshot({path: path.join(outDir, `gallery-last-group-${engine}.png`)});
    await page.selectOption('#gallery-group', groups[0]);

    const held = await page.evaluate(() => window.__metoc.engine().name);
    check(held === engine, `the page is on ${engine}`);

    // Draw a cold front with real mouse input, then reshape and move it.
    await page.click('#clear');
    await page.click('.tile[data-graphic="ColdFront"]');
    const box = await page.locator('#map').boundingBox();
    const at = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
    // The first point stays clear of the properties panel, which covers the map's top-right corner.
    for (const [fx, fy] of [
        [0.62, 0.4],
        [0.5, 0.5],
    ]) {
        await page.mouse.click(...at(fx, fy));
    }
    await page.mouse.dblclick(...at(0.25, 0.4));
    await page.waitForTimeout(300);
    const drawn = await page.evaluate(() => {
        const {collection, interaction} = window.__metoc;
        const f = collection.list()[0];
        return {n: collection.size, points: f?.geometry.coordinates.length, selected: interaction.selectedId === f?.id, mode: interaction.mode};
    });
    check(drawn.n === 1 && drawn.points === 3, `draws a cold front from three clicks (${JSON.stringify(drawn)})`);
    check(drawn.selected && drawn.mode === 'idle', 'selects it and returns to idle');

    const before = await page.evaluate(() => window.__metoc.collection.list()[0].geometry.coordinates[0]);
    await page.mouse.move(...at(0.62, 0.4));
    await page.mouse.down();
    await page.mouse.move(...at(0.64, 0.3), {steps: 5});
    await page.mouse.up();
    const after = await page.evaluate(() => window.__metoc.collection.list()[0].geometry.coordinates);
    check(after.length === 3 && after[0][1] > before[1], 'dragging the first handle moves that point north');

    await page.click('#properties button:has-text("Flip side")');
    const flipped = await page.evaluate(() => window.__metoc.collection.list()[0].geometry.coordinates);
    check(JSON.stringify(flipped) === JSON.stringify([...after].reverse()), 'Flip side reverses the points');

    await page.keyboard.press('Delete');
    check((await page.evaluate(() => window.__metoc.collection.size)) === 0, 'Delete removes the selected graphic');

    // An area, with the fields the registry offers it, typed into the properties panel.
    await page.click('.tile[data-graphic="TropicalStormWindArea"]');
    for (const [fx, fy] of [
        [0.4, 0.35],
        [0.6, 0.35],
        [0.62, 0.6],
    ]) {
        await page.mouse.click(...at(fx, fy));
    }
    await page.mouse.dblclick(...at(0.42, 0.62));
    await page.waitForTimeout(300);
    const area = await page.evaluate(() => {
        const f = window.__metoc.collection.list()[0];
        return {type: f?.geometry.type, ring: f?.geometry.coordinates?.[0]?.length};
    });
    check(area.type === 'Polygon' && area.ring === 5, `draws a wind area from four clicks as a closed Polygon (${JSON.stringify(area)})`);
    const offered = await page.evaluate(() => ({
        value: !!document.querySelector('#prop-value'),
        dtg: !!document.querySelector('#prop-dtg'),
        dashed: [...document.querySelectorAll('#properties label.check')].some((l) => l.textContent.includes('Dashed')),
        filled: [...document.querySelectorAll('#properties label.check')].some((l) => l.textContent.includes('Filled')),
        flip: [...document.querySelectorAll('#properties button')].some((b) => b.textContent === 'Flip side'),
    }));
    check(offered.value && offered.dtg && !offered.dashed && !offered.filled && !offered.flip, `the panel offers what the registry says (${JSON.stringify(offered)})`);
    await page.fill('#prop-value', '34 KT');
    await page.fill('#prop-dtg', '221800Z');
    const props = await page.evaluate(() => window.__metoc.collection.list()[0].properties.metoc);
    check(props.value === '34 KT' && props.dtg === '221800Z', `typed fields are saved (${JSON.stringify(props)})`);
    await page.fill('#prop-dtg', '');
    const cleared = await page.evaluate(() => window.__metoc.collection.list()[0].properties.metoc);
    check(!('dtg' in cleared), 'an emptied field is removed, not saved empty');
    await page.screenshot({path: path.join(outDir, `area-${engine}.png`)});

    // Undo and redo: one step per gesture.
    await page.click('#properties button:has-text("Delete")');
    const afterDelete = await page.evaluate(() => window.__metoc.collection.size);
    await page.keyboard.press('Control+z');
    const afterUndo = await page.evaluate(() => window.__metoc.collection.size);
    await page.keyboard.press('Control+y');
    const afterRedo = await page.evaluate(() => window.__metoc.collection.size);
    check(afterDelete === 0 && afterUndo === 1 && afterRedo === 0, `Ctrl+Z restores a deleted area and Ctrl+Y deletes it again (${afterDelete}, ${afterUndo}, ${afterRedo})`);
    // Duplicate and nudge, from the keyboard, on the restored area.
    await page.keyboard.press('Control+z');
    await page.evaluate(() => window.__metoc.interaction.select(window.__metoc.collection.list()[0].id));
    await page.mouse.move(...at(0.9, 0.9));
    await page.keyboard.press('Control+d');
    const dup = await page.evaluate(() => window.__metoc.collection.size);
    check(dup === 2, `Ctrl+D duplicates the selected graphic (${dup})`);
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+y');
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+y');
    await page.keyboard.press('Control+z');
    // Now back at "deleted area restored": its typed value came back with it. One more step back
    // is before the value was typed.
    const props2 = await page.evaluate(() => ({n: window.__metoc.collection.size, metoc: window.__metoc.collection.list()[0]?.properties.metoc}));
    check(props2.n === 1 && props2.metoc?.value === '34 KT', `undo brings back the area with its typed value (${JSON.stringify(props2)})`);
    await page.click('#undo');
    const props3 = await page.evaluate(() => window.__metoc.collection.list()[0]?.properties.metoc);
    check(props3 && !('value' in props3), `the toolbar Undo steps back to before the value was typed (${JSON.stringify(props3)})`);

    // Points: a one-click pressure centre, and a two-click wind barb.
    await page.click('#clear');
    await page.click('.tile[data-graphic="HighPressureCenter"]');
    await page.mouse.click(...at(0.3, 0.5));
    await page.waitForTimeout(200);
    const high = await page.evaluate(() => window.__metoc.collection.list()[0]?.geometry.type);
    check(high === 'Point', `one click places a high-pressure centre (${high})`);
    // The panel shows the graphic, one size for every graphic, and marks the size chosen.
    await page.click('#properties button:has-text("Large")');
    await page.waitForTimeout(150);
    const shown = await page.evaluate(() => {
        const box = document.querySelector('#prop-preview')?.getBoundingClientRect();
        const svg = document.querySelector('#prop-preview svg')?.getBoundingClientRect();
        const pressed = [...document.querySelectorAll('#properties .row button[aria-pressed="true"]')].map((b) => b.textContent);
        const look = getComputedStyle(document.querySelector('#properties .row button[aria-pressed="true"]')).fontWeight;
        return {box: box && `${Math.round(box.width)}x${Math.round(box.height)}`, svg: svg && `${Math.round(svg.width)}x${Math.round(svg.height)}`, pressed, look};
    });
    check(
        shown.box === '104x50' && shown.svg === '44x44' && shown.pressed.join() === 'Large' && shown.look === '600',
        `the panel previews the high at one size and marks Large as chosen (${JSON.stringify(shown)})`,
    );
    await page.click('.tile[data-graphic="WindBarb"]');
    await page.mouse.click(...at(0.5, 0.5));
    await page.mouse.move(...at(0.45, 0.5), {steps: 3});
    await page.mouse.click(...at(0.45, 0.5));
    await page.waitForTimeout(200);
    const barb = await page.evaluate(() => window.__metoc.collection.list().find((f) => f.properties.metoc.name === 'WindBarb')?.properties.metoc);
    check(barb && Math.abs(barb.windDirection - 270) <= 2, `two clicks draw a wind barb from the west (${JSON.stringify(barb)})`);
    const windFields = await page.evaluate(() => !!document.querySelector('#prop-wind-dir') && !!document.querySelector('#prop-wind-speed'));
    check(windFields, 'the panel offers wind direction and speed');
    await page.fill('#prop-wind-speed', '65');
    const speed = await page.evaluate(() => window.__metoc.collection.list().find((f) => f.properties.metoc.name === 'WindBarb').properties.metoc.windSpeed);
    check(speed === 65, `the typed speed is saved as a number (${speed})`);

    // A station plot: two clicks like the barb, then its observation in the panel.
    await page.click('.tile[data-graphic="StationPlot"]');
    await page.mouse.click(...at(0.6, 0.6));
    await page.mouse.move(...at(0.55, 0.6), {steps: 3});
    await page.mouse.click(...at(0.55, 0.6));
    await page.waitForTimeout(200);
    await page.fill('#prop-temp', '24');
    await page.fill('#prop-dew', '18');
    await page.fill('#prop-pressure', '1013.2');
    await page.selectOption('#prop-cloud', 'CloudScattered');
    await page.selectOption('#prop-weather', 'RainContinuousModerate');
    const obs = await page.evaluate(() => window.__metoc.collection.list().find((f) => f.properties.metoc.name === 'StationPlot')?.properties.metoc);
    check(
        obs && obs.temperature === 24 && obs.dewPoint === 18 && obs.pressure === 1013.2 && obs.cloudCover === 'CloudScattered' && obs.weather === 'RainContinuousModerate' && Math.abs(obs.windDirection - 270) <= 2,
        `a station plot takes its wind from two clicks and its observation from the panel (${JSON.stringify(obs)})`,
    );

    // A self-crossing area is refused, with the reason on screen.
    await page.click('.tile[data-graphic="Fog"]');
    for (const [fx, fy] of [
        [0.6, 0.3],
        [0.8, 0.6],
        [0.8, 0.3],
    ]) {
        await page.mouse.click(...at(fx, fy));
    }
    await page.mouse.dblclick(...at(0.6, 0.6));
    await page.waitForTimeout(200);
    const refused = await page.evaluate(() => ({
        fog: window.__metoc.collection.list().some((f) => f.properties.metoc.name === 'Fog'),
        mode: window.__metoc.interaction.mode,
        status: document.querySelector('#status').textContent,
    }));
    check(!refused.fog && refused.mode === 'drawing' && /crosses itself/.test(refused.status), `a self-crossing area is refused and explained (${JSON.stringify(refused)})`);
    await page.keyboard.press('Escape');

    await page.click('#gallery');
    await page.waitForTimeout(1500);
    await page.screenshot({path: path.join(outDir, `gallery-${engine}.png`)});
}

// Dark mode: the page, the basemap and the library's palette switch together.
console.log('\ndark mode');
await page.click('#settings-toggle');
await page.click('[data-theme-choice="dark"]');
const theme = await page.evaluate(() => document.documentElement.dataset.theme);
check(theme === 'dark', `Settings > Dark sets the page theme (${theme})`);
for (const engine of ['openlayers', 'maplibre']) {
    await page.click(`.engine button[data-engine="${engine}"]`);
    await page.waitForTimeout(engine === 'maplibre' ? 2500 : 800);
    await page.click('#gallery');
    await page.waitForTimeout(1500);
    await page.screenshot({path: path.join(outDir, `gallery-${engine}-dark.png`)});
}
const darkCount = await page.evaluate(() => window.__metoc.collection.size);
check(darkCount > 0, `the gallery draws in dark mode (${darkCount})`);
const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('metoc-demo:v1')).theme);
check(persisted === 'dark', `the choice is remembered (${persisted})`);
await page.click('[data-theme-choice="light"]');
await page.click('#settings-toggle');

// 3D: MapLibre on terrain, and any add-on engine. Point symbols stand on leader lines, clear of the
// ground, and are picked where they are drawn; the map controls zoom, tilt and turn north.
console.log('\n3D');
for (const engine of tilting) {
    await page.click(`.engine button[data-engine="${engine}"]`);
    await page.waitForFunction((e) => window.__metoc.engine()?.name === e, engine, {timeout: 60000});
    if (engine === 'maplibre3d') {
        await page.waitForFunction(() => !!window.__metoc.engine().host.map.getSource('terrain') && window.__metoc.engine().host.map.getPitch() > 50, null, {timeout: 60000});
        // Terrain only from zoom 8: further out, the sea floor's tile edges showed as boxes and streaks.
        const terrain = await page.evaluate(async () => {
            const map = window.__metoc.engine().host.map;
            const at = (z) => new Promise((r) => { map.once('zoomend', () => r(!!map.getTerrain())); map.jumpTo({zoom: z}); });
            const out = await at(5);
            const near = await at(11);
            return {out, near};
        });
        check(!terrain.out && terrain.near, `${engine}: terrain from zoom 8 in, not further out (${JSON.stringify(terrain)})`);
    }
    await page.waitForTimeout(settle(engine));
    const controls = await page.evaluate(() => [...document.querySelectorAll('#map-controls button')].filter((b) => b.offsetParent).map((b) => b.id).join());
    check(controls === 'zoom-in,zoom-out,tilt-up,tilt-down,reset-north', `${engine}: the map controls zoom, tilt and turn north (${controls})`);
    await page.click('#clear');
    await page.click('.tile[data-graphic="HighPressureCenter"]');
    const box = await page.locator('#map').boundingBox();
    await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.6);
    await page.waitForTimeout(600);
    const placed = await page.evaluate(() => {
        const m = window.__metoc;
        const f = m.collection.list()[0];
        const px = f && m.engine().view.toPixel(f.geometry.coordinates);
        return {id: f?.id, px, lift: m.engine().view.pointLiftPx?.() ?? 0};
    });
    check(placed.id && placed.lift === 48, `${engine}: a point symbol stands on a 48 px leader line (${JSON.stringify(placed)})`);
    const leaders = () => page.evaluate(() => window.__metoc.engine().host.map.querySourceFeatures('metoc-graphics', {filter: ['==', ['get', 'kind'], 'leader']}).length);
    if (engine === 'maplibre3d') check((await leaders()) >= 1, `${engine}: drawn as one upright picture on its leader line (${await leaders()})`);
    // The Settings switch lays them on the ground and stands them up again.
    await page.click('#settings-toggle');
    await page.uncheck('#leader-lines');
    await page.waitForTimeout(500);
    const off = await page.evaluate(() => window.__metoc.engine().view.pointLiftPx?.() ?? 0);
    const offLeaders = engine === 'maplibre3d' ? await leaders() : 0;
    await page.check('#leader-lines');
    await page.waitForTimeout(500);
    const on = await page.evaluate(() => window.__metoc.engine().view.pointLiftPx?.() ?? 0);
    await page.click('#settings-toggle');
    check(off === 0 && offLeaders === 0 && on === 48, `${engine}: the Leader lines setting switches them off and on (${off}, ${offLeaders}, ${on})`);
    // Picked where it is drawn: 48 px up the screen from its location.
    await page.keyboard.press('Escape');
    const rect = await page.locator('#map').boundingBox();
    await page.mouse.click(rect.x + placed.px[0], rect.y + placed.px[1] - 48);
    await page.waitForTimeout(300);
    check(await page.evaluate((id) => window.__metoc.interaction.selectedId === id, placed.id), `${engine}: clicking the raised symbol selects it`);
    await page.screenshot({path: path.join(outDir, `3d-${engine}.png`)});
    const pitch = () =>
        page.evaluate(() => {
            return Math.round(window.__metoc.engine().camera.pitch());
        });
    const before = await pitch();
    await page.click('#tilt-down');
    await page.waitForTimeout(800);
    const after = await pitch();
    // Degrees from straight down, on every engine (EngineCamera.pitch).
    const down = before - after;
    check(Math.abs(down - 15) <= 1 || after === 0, `${engine}: tilt down turns the view 15° toward straight down (${before} → ${after})`);
    await page.keyboard.press('Escape');
}

// The antimeridian: a front drawn with real clicks across ±180° on every engine is saved as one
// continuous line, the short way, and drags with its handles on the line the view shows.
console.log('\nantimeridian');
// Set before the page's scripts run: the page saves its view on beforeunload, over anything
// written before a reload.
await page.addInitScript(() => {
    if (sessionStorage.getItem('antimeridian')) return;
    sessionStorage.setItem('antimeridian', '1');
    const saved = JSON.parse(localStorage.getItem('metoc-demo:v1') ?? '{}');
    localStorage.setItem('metoc-demo:v1', JSON.stringify({...saved, engine: 'openlayers', view: {center: [180, -15], zoom: 4}, graphics: undefined}));
});
await page.reload();
await page.waitForFunction(() => window.__metoc?.engine()?.name === 'openlayers');
for (const engine of flat) {
    await page.click(`.engine button[data-engine="${engine}"]`);
    await page.waitForFunction((e) => window.__metoc.engine()?.name === e, engine, {timeout: 60000});
    await page.waitForTimeout(settle(engine));
    await page.click('#clear');
    await page.click('.tile[data-graphic="ColdFront"]');
    const box = await page.locator('#map').boundingBox();
    const at = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
    await page.mouse.click(...at(0.3, 0.5));
    await page.mouse.click(...at(0.5, 0.45));
    await page.mouse.dblclick(...at(0.7, 0.5));
    await page.waitForTimeout(400);
    const line = await page.evaluate(() => window.__metoc.collection.list()[0]?.geometry.coordinates.map((p) => p[0]) ?? []);
    const continuous = line.length === 3 && line.every((l, i) => i === 0 || Math.abs(l - line[i - 1]) < 180);
    const crosses = line.length === 3 && Math.min(...line) < 180 && Math.max(...line) > 180;
    check(continuous && crosses && line[0] >= -180 && line[0] < 180, `${engine}: a front drawn across ±180° is saved continuous, the short way (${line.map((l) => l.toFixed(1)).join(', ')})`);
    // Drag its last point back across: the handle is where the line is drawn.
    await page.mouse.move(...at(0.7, 0.5));
    await page.mouse.down();
    await page.mouse.move(...at(0.6, 0.6), {steps: 5});
    await page.mouse.up();
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.__metoc.collection.list()[0]?.geometry.coordinates.map((p) => p[0]) ?? []);
    check(after.length === 3 && Math.abs(after[2] - line[2]) > 0.5 && Math.abs(after[2] - line[2]) < 30, `${engine}: its end handle drags on the line the view shows (${line[2]?.toFixed(1)} → ${after[2]?.toFixed(1)})`);
    await page.screenshot({path: path.join(outDir, `antimeridian-${engine}.png`)});
}

check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
