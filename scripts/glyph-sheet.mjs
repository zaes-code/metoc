#!/usr/bin/env node
/**
 * Screenshots the development glyph sheet (sheet.html) for a query, to compare icons with the
 * standard's drawings.
 *
 *   node scripts/glyph-sheet.mjs "set=46&code=1201" out.png
 *
 * Needs `npm start` running.
 */
import {chromium} from 'playwright';

const [query = '', out = '.playwright-out/sheet.png'] = process.argv.slice(2);
const browser = await chromium.launch().catch(() => chromium.launch({channel: 'msedge'}));
const page = await browser.newPage({viewport: {width: 1300, height: 900}});
await page.goto(`http://localhost:3100/sheet.html?${query}`);
await page.waitForFunction(() => window.__sheetReady === true);
await page.screenshot({path: out, fullPage: true});
await browser.close();
console.log(out);
