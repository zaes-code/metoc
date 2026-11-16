#!/usr/bin/env node
/**
 * Checks that `@zaes/metoc` pins the engine it is built and tested against.
 *
 * The package depends on `@zaes/symbology-engine` and `@zaes/symbology-editor` at one exact version
 * each, while the workspace links the engine's checkout (`../symbology-engine`) or, without it, the
 * installed packages. A pin that lags the linked engine publishes a package that was never tested
 * against what its users install. This fails when:
 *
 * - a pin is not an exact version (a range would let users install an engine nobody tested);
 * - a pin differs from the version of the engine package the workspace links;
 * - the editor the workspace links depends on another engine version than the one pinned;
 * - package-lock.json (when there is one) records other pins than package.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = {'@zaes/symbology-engine': 'engine', '@zaes/symbology-editor': 'engine-editor'};
const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const problems = [];

const metoc = readJson(path.join(root, 'packages', 'metoc', 'package.json'));
const pins = metoc.dependencies ?? {};

/** The engine package the workspace resolves: the sibling checkout first, as the build does. */
function linked(name, dir) {
    const sibling = path.join(root, '..', 'symbology-engine', 'packages', dir, 'package.json');
    if (fs.existsSync(sibling)) return {file: sibling, pkg: readJson(sibling)};
    const installed = path.join(root, 'node_modules', ...name.split('/'), 'package.json');
    if (fs.existsSync(installed)) return {file: installed, pkg: readJson(installed)};
    return undefined;
}

for (const [name, dir] of Object.entries(PACKAGES)) {
    const pin = pins[name];
    if (pin === undefined) {
        problems.push(`packages/metoc/package.json does not depend on ${name}`);
        continue;
    }
    if (!EXACT.test(pin)) problems.push(`${name} is pinned as "${pin}", not an exact version`);
    const found = linked(name, dir);
    if (!found) {
        problems.push(`${name} is neither in ../symbology-engine nor installed: run npm install`);
        continue;
    }
    const rel = path.relative(root, found.file).replaceAll('\\', '/');
    if (found.pkg.version !== pin) problems.push(`${name} is pinned at ${pin}, but the linked engine is ${found.pkg.version} (${rel})`);
    const engineDep = found.pkg.dependencies?.['@zaes/symbology-engine'];
    const enginePin = pins['@zaes/symbology-engine'];
    if (engineDep !== undefined && enginePin !== undefined && engineDep !== enginePin) {
        problems.push(`the linked ${name} depends on @zaes/symbology-engine ${engineDep}, but the pin is ${enginePin} (${rel})`);
    }
}

const lockFile = path.join(root, 'package-lock.json');
if (fs.existsSync(lockFile)) {
    const locked = readJson(lockFile).packages?.['packages/metoc']?.dependencies ?? {};
    for (const name of Object.keys(PACKAGES)) {
        if (pins[name] !== undefined && locked[name] !== pins[name]) {
            problems.push(`package-lock.json records ${name} ${locked[name] ?? '(none)'}, package.json ${pins[name]}: refresh the lockfile`);
        }
    }
}

if (problems.length) {
    console.error(`\nENGINE PIN CHECK FAILED:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    process.exit(1);
}
console.log(`ok  @zaes/metoc pins the linked engine: ${Object.keys(PACKAGES).map((n) => `${n} ${pins[n]}`).join(', ')}`);
