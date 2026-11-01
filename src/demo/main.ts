/**
 * The sample page. It consumes the library exactly as a customer would — through `@zaes/metoc`,
 * `@zaes/metoc/openlayers` and `@zaes/metoc/maplibre`, never a deep path — so it exercises the
 * surface that ships. Not published.
 */

import './demo.css';
import {
    METOC_DARK_MAP,
    METOC_LIGHT_MAP,
    MetocCollection,
    colorOf,
    configureMetoc,
    drawnPoints,
    getDefaultLineColor,
    flipMetocFeature,
    validateMetocFeature,
    getMetocConfig,
    getMetocDisplayName,
    getMetocSpec,
    isPointSize,
    listMetocGraphics,
    metocSidc,
    metocThumbnailSvg,
    type MetocFeature,
    type MetocGraphicName,
    type PointSize,
} from '@zaes/metoc';
import {METOC_COLOR_ROLE_NAMES, MetocHistory, MetocInteraction, attachMetocEditor, getMetocFields, stationChoices} from '@zaes/metoc/editor';
import {demoAddons, demoTools} from '@demo/addons';
import {createEngine, type EngineHandle, type EngineName, type ViewState} from './engines';
import {CATEGORY_ORDER, drawSampleGallery} from './sampleGallery';
import {decorateIcons} from './icons';

// ── persistence (best effort: a private window or blocked storage just starts empty) ──────────

const STORE = 'metoc-demo:v1';
interface Saved {
    engine?: EngineName;
    view?: ViewState;
    graphics?: unknown;
    settings?: {
        lineWidth?: number;
        pipSize?: number;
        smoothLines?: boolean;
        basemapOpacity?: number;
        defaultLineColor?: string;
        pointSize?: PointSize;
        leaderLines?: boolean;
        showLabels?: boolean;
        labelColor?: string;
        labelFont?: string;
        allowPointRotation?: boolean;
        snap?: boolean;
        handleColor?: string;
        pointFullSizeScale?: number;
    };
    theme?: ThemeChoice;
    galleryGroup?: string;
}

type ThemeChoice = 'system' | 'light' | 'dark';
function readSaved(): Saved {
    try {
        return JSON.parse(localStorage.getItem(STORE) ?? '{}') as Saved;
    } catch {
        return {};
    }
}
function writeSaved(patch: Partial<Saved>): void {
    try {
        localStorage.setItem(STORE, JSON.stringify({...readSaved(), ...patch}));
    } catch {
        // storage unavailable; the page still works
    }
}

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const saved = readSaved();
const collection = new MetocCollection();
if (saved.graphics) collection.load(saved.graphics);
let basemapOpacity = saved.settings?.basemapOpacity ?? 0.65;
/** Point symbols on leader lines in 3D: on unless switched off. */
let leaderLines = saved.settings?.leaderLines ?? true;
configureMetoc({
    lineWidth: saved.settings?.lineWidth ?? 2,
    pipSize: saved.settings?.pipSize ?? 10,
    smoothLines: saved.settings?.smoothLines ?? true,
    pointSize: isPointSize(saved.settings?.pointSize) ? saved.settings.pointSize : 'medium',
    // A chosen line colour for what the standard draws black; absent, the theme's black.
    defaultLineColor: saved.settings?.defaultLineColor,
    showLabels: saved.settings?.showLabels ?? true,
    labelColor: saved.settings?.labelColor,
    labelFont: saved.settings?.labelFont,
    allowPointRotation: saved.settings?.allowPointRotation ?? false,
    pointFullSizeScale: saved.settings?.pointFullSizeScale,
    ...(saved.settings?.handleColor ? {handleColor: saved.settings.handleColor} : {}),
});
/** Snap points being drawn or dragged onto other graphics' points, this many pixels out. */
const SNAP_PX = 10;

// The editor needs a view before the first engine exists; attaching it to one replaces this at once.
const interaction = new MetocInteraction(collection, {toPixel: () => [NaN, NaN], toLonLat: () => [0, 0]}, {snapPx: saved.settings?.snap ? SNAP_PX : 0});
const history = new MetocHistory(collection);

// ── appearance ─────────────────────────────────────────────────────────────────
//
// The library has no light or dark mode: it has colours, and this page sends the set it wants.
// Dark changes only what would vanish on a dark map — the standard's black, and the label halo —
// and leaves every other colour as Table M-II gives it. One function writes the whole palette, so
// switching back to light cannot leave a dark value behind.

let themeChoice: ThemeChoice = saved.theme ?? 'system';
const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)');
const isDark = () => themeChoice === 'dark' || (themeChoice === 'system' && !!systemDark?.matches);


function applyTheme(): void {
    const dark = isDark();
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    configureMetoc(dark ? METOC_DARK_MAP : METOC_LIGHT_MAP);
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]')) b.setAttribute('aria-pressed', String(b.dataset.themeChoice === themeChoice));
    if (engine) {
        engine.setDarkBasemap(dark);
        engine.refresh();
    }
    // Thumbnails are painted from the palette, so they follow it.
    renderPicker(searchText());
    renderProperties(true);
    // Unset, the line colour follows the theme's black.
    if (document.querySelector('#line-color')) showLineColor();
}
systemDark?.addEventListener?.('change', () => themeChoice === 'system' && applyTheme());

let engine: EngineHandle;
let detachEditor = () => {};
let viewState: ViewState = saved.view ?? {center: [-95, 38], zoom: 3.6};
let engineRequest = 0;

async function startEngine(name: EngineName, view?: ViewState): Promise<void> {
    // An add-on engine loads on demand, so a second pick can arrive before the first engine exists; the
    // latest pick wins and an earlier one that resolves late is thrown away.
    const request = ++engineRequest;
    if (engine) {
        viewState = view ?? engine.viewState();
        detachEditor();
        engine.dispose();
        detachEditor = () => {};
    }
    const target = $('#map');
    target.replaceChildren();
    for (const b of document.querySelectorAll<HTMLButtonElement>('.engine button')) b.setAttribute('aria-pressed', String(b.dataset.engine === name));
    const next = await createEngine(name, target, collection, viewState, basemapOpacity, isDark(), leaderLines, demoAddons);
    if (request !== engineRequest) {
        next.dispose();
        return;
    }
    engine = next;
    // The editor is an add-on: the renderer only displays, and editing attaches to it as a host.
    detachEditor = attachMetocEditor(engine.host, interaction);
    for (const b of document.querySelectorAll<HTMLButtonElement>('.engine button')) b.setAttribute('aria-pressed', String(b.dataset.engine === name));
    // Tilt and north only where the camera tilts: MapLibre 3D, and an add-on engine that tilts.
    $('#map-controls').classList.toggle('is-3d', !!engine.camera.tilt);
    writeSaved({engine: name});
}

// Saved a moment after the last change: a drag changes the collection on every pointer move, and
// serialising every graphic into storage that often made dragging stutter with a full gallery.
let saveTimer = 0;
collection.subscribe(() => {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => writeSaved({graphics: collection.toGeoJSON()}), 300);
});
window.addEventListener('beforeunload', () => {
    clearTimeout(saveTimer);
    writeSaved({view: engine.viewState(), graphics: collection.toGeoJSON()});
});

// ── picker ─────────────────────────────────────────────────────────────────────

const searchText = () => ($<HTMLInputElement>('#search')?.value ?? '');

/** Which picker groups are folded, remembered for the visit. */
const folded = new Set<string>();

function renderPicker(filter = ''): void {
    const list = $('#picker-list');
    list.replaceChildren();
    const q = filter.trim().toLowerCase();
    let lastSet = 0;
    for (const category of CATEGORY_ORDER) {
        const names = listMetocGraphics().filter((n) => {
            const s = getMetocSpec(n);
            return s.category === category && (!q || s.displayName.toLowerCase().includes(q) || (s.entityCode ?? '').includes(q));
        });
        if (names.length === 0) continue;
        const set = getMetocSpec(names[0]).symbolSet;
        if (set !== lastSet) {
            const h = document.createElement('h2');
            h.className = 'set-heading';
            h.textContent = set === 45 ? 'Atmospheric · symbol set 45' : 'Oceanographic · symbol set 46';
            list.append(h);
            lastSet = set;
        }
        // A fold per group: 345 graphics are a long list, and a search opens every group it matches.
        const group = document.createElement('details');
        group.open = !!q || !folded.has(category);
        group.addEventListener('toggle', () => (group.open ? folded.delete(category) : folded.add(category)));
        const summary = document.createElement('summary');
        summary.textContent = `${category} (${names.length})`;
        group.append(summary);
        for (const name of names) group.append(tile(name));
        list.append(group);
    }
    if (!list.children.length) {
        const p = document.createElement('p');
        p.className = 'hint';
        p.textContent = 'No graphic matches.';
        list.append(p);
    }
}

function tile(name: MetocGraphicName): HTMLButtonElement {
    const s = getMetocSpec(name);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.dataset.graphic = name;
    b.setAttribute('aria-pressed', String(interaction.drawing === name));
    b.title = `Draw ${s.displayName}`;
    const thumb = document.createElement('span');
    thumb.className = 'thumb';
    thumb.innerHTML = metocThumbnailSvg(name, {width: 92, height: 32, scale: 0.62, value: s.valueField && s.geometry === 'line' ? '12' : undefined});
    const label = document.createElement('span');
    label.className = 'label';
    const a = document.createElement('span');
    a.textContent = s.displayName;
    const c = document.createElement('span');
    c.textContent = s.entityCode ? `45 · ${s.entityCode}` : 'Table M-I draw rule · no SIDC';
    label.append(a, c);
    b.append(thumb, label);
    b.addEventListener('click', () => {
        if (interaction.drawing === name) interaction.cancelDrawing();
        else interaction.startDrawing(name);
    });
    return b;
}

// ── status and properties ──────────────────────────────────────────────────────

function renderStatus(): void {
    const status = $('#status');
    const drawing = interaction.drawing;
    if (drawing) {
        const spec = getMetocSpec(drawing);
        const name = getMetocDisplayName(drawing);
        status.textContent =
            spec.geometry === 'point'
                ? spec.directional
                    ? `Drawing ${name}: click the station, then click the direction the wind blows from. Esc to cancel.`
                    : `Drawing ${name}: click where it goes. Esc to cancel.`
                : `Drawing ${name}: click ${spec.geometry === 'area' ? 'at least three points around the area' : 'points along the line'}, double-click or Enter to finish, Backspace to undo a point, Esc to cancel.`;
    } else if (interaction.selectedId) {
        status.textContent = 'Drag the outline to move it, a point to reshape, a + to add a point. Alt-click removes a point; Delete removes the graphic.';
    } else {
        status.textContent = collection.size === 0 ? 'Pick a graphic on the left to draw it, or open the sample gallery.' : '';
    }
    for (const b of document.querySelectorAll<HTMLButtonElement>('.tile')) b.setAttribute('aria-pressed', String(b.dataset.graphic === drawing));
    // Touch has no double-click, and not everyone knows Enter finishes: the same commands as buttons.
    // A point finishes on its own click; the bar is for lines and areas.
    $('#drawbar').hidden = !drawing || getMetocSpec(drawing).geometry === 'point';
}

let shownId: string | null = null;

/** The panel's picture of the selected graphic, drawn with its own colour, dash, fill and value. */
function renderPreview(f: MetocFeature, box = document.querySelector('#prop-preview')): void {
    if (!box) return;
    const {name, size: _size, ...own} = f.properties.metoc;
    const point = getMetocSpec(name).geometry === 'point';
    // A point fills a square in the frame; a line or an area its width. Every graphic, one size.
    box.classList.toggle('square', point);
    box.innerHTML = point
        ? metocThumbnailSvg(name, {width: 44, height: 44, scale: 0.9, properties: own})
        : metocThumbnailSvg(name, {width: 96, height: 40, scale: 0.62, properties: own});
}

function renderProperties(force = false): void {
    const panel = $('#properties');
    const id = interaction.selectedId;
    const f = id ? collection.get(id) : undefined;
    if (!f || !id) {
        panel.hidden = true;
        shownId = null;
        return;
    }
    // A typed edit still waiting for its undo step belongs to the graphic it was typed for: record it
    // before another graphic's panel replaces the field (selecting from code or by keyboard runs no
    // pointerdown to flush it, and its checkpoint, landing later, rebuilt the new panel under the
    // operator's typing).
    if (shownId !== id) flushPendingEdit();
    // Rebuilding while the operator types would steal focus; only rebuild on a new selection.
    if (!force && shownId === id && !panel.hidden) return;
    // A rebuild of the same graphic (undo, redo, a recorded step) keeps the field being typed in.
    const focused = shownId === id && document.activeElement instanceof HTMLInputElement && panel.contains(document.activeElement) ? document.activeElement : null;
    const caret = focused && focused.type === 'text' ? [focused.selectionStart, focused.selectionEnd] : null;
    shownId = id;
    const p = f.properties.metoc;
    const s = getMetocSpec(p.name);
    // Which inputs to offer is the library's call, not this page's: the same field set drives
    // any host's dialog. @see getMetocFields
    const fields = getMetocFields(p.name);
    panel.hidden = false;
    panel.replaceChildren();

    const h = document.createElement('h2');
    h.textContent = s.displayName;
    const facts = document.createElement('dl');
    facts.className = 'facts';
    for (const [k, v] of [
        ['Symbol set', s.symbolSet === 46 ? '46 Oceanographic' : '45 Atmospheric'],
        ['Entity code', s.entityCode ?? `none in Table ${s.symbolSet === 46 ? 'A-LII' : 'A-LI'}`],
        ['SIDC', metocSidc(p.name) ?? 'none'],
        ['Draw rule', s.drawRule],
        ['Points', String(drawnPoints(f).length)],
    ]) {
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        dd.textContent = v;
        if (k === 'Points') dd.id = 'prop-points';
        if (k === 'SIDC' && metocSidc(p.name)) {
            const copy = document.createElement('button');
            copy.type = 'button';
            copy.className = 'icon-only mini';
            copy.title = 'Copy the SIDC';
            copy.setAttribute('aria-label', 'Copy the SIDC');
            copy.dataset.icon = 'copy';
            copy.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(v);
                    copy.dataset.copied = 'true';
                    setTimeout(() => delete copy.dataset.copied, 1200);
                } catch {
                    // Clipboard refused (insecure origin, permissions): the code is on screen to select.
                }
            });
            dd.append(' ', copy);
        }
        facts.append(dt, dd);
    }
    // The selected graphic as it is drawn, at the one size every graphic gets (as in the picker).
    const head = document.createElement('div');
    head.className = 'head';
    const preview = document.createElement('div');
    preview.id = 'prop-preview';
    preview.className = 'preview';
    head.append(preview, h);
    renderPreview(f, preview);
    panel.append(head, facts);

    const textField = (id_: string, label: string, placeholder: string, value: string | undefined, write: (v: string | undefined) => void) => {
        const l = document.createElement('label');
        l.textContent = label;
        l.htmlFor = id_;
        const input = document.createElement('input');
        input.type = 'text';
        input.id = id_;
        input.value = value ?? '';
        input.placeholder = placeholder;
        // An emptied field removes the property: absence is the information, not "".
        input.addEventListener('input', () => {
            write(input.value.trim() === '' ? undefined : input.value);
            checkpointSoon();
        });
        panel.append(l, input);
    };

    if (fields.value) textField('prop-value', fields.value.label, fields.value.placeholder, p.value, (v) => collection.setProperties(id, {value: v}));
    if (fields.dtg) textField('prop-dtg', 'Date-time group', 'e.g. 221800ZOCT26', p.dtg, (v) => collection.setProperties(id, {dtg: v}));

    const numberField = (id_: string, label: string, placeholder: string, value: number | undefined, write: (v: number | undefined) => void, min: string | null = '0') => {
        const l = document.createElement('label');
        l.textContent = label;
        l.htmlFor = id_;
        const input = document.createElement('input');
        input.type = 'number';
        input.id = id_;
        if (min !== null) input.min = min;
        input.step = 'any';
        input.value = value === undefined ? '' : String(value);
        input.placeholder = placeholder;
        // Empty means missing, which the standard draws differently from zero.
        input.addEventListener('input', () => {
            const n = input.value.trim() === '' ? undefined : Number(input.value);
            write(n === undefined || !isFinite(n) ? undefined : n);
            checkpointSoon();
        });
        panel.append(l, input);
    };
    if (fields.wind) {
        numberField('prop-wind-dir', 'Direction, from (degrees true)', 'e.g. 270', p.windDirection, (v) => collection.setProperties(id, {windDirection: v}));
        numberField('prop-wind-speed', 'Speed (knots)', 'missing', p.windSpeed, (v) => collection.setProperties(id, {windSpeed: v}));
    }
    if (fields.station) {
        // The observation around the station: each piece optional, as the station model leaves out what is missing.
        const choice = (id_: string, label: string, names: MetocGraphicName[], value: MetocGraphicName | undefined, write: (v: MetocGraphicName | undefined) => void) => {
            const l = document.createElement('label');
            l.textContent = label;
            l.htmlFor = id_;
            const select = document.createElement('select');
            select.id = id_;
            select.append(new Option('Missing', ''), ...names.map((n) => new Option(getMetocDisplayName(n).replace(/^(Cloud Coverage|Pressure Tendency) - /, ''), n)));
            select.value = value ?? '';
            select.addEventListener('change', () => {
                write((select.value || undefined) as MetocGraphicName | undefined);
                history.checkpoint();
            });
            panel.append(l, select);
        };
        const pick = stationChoices();
        choice('prop-cloud', 'Sky cover', pick.cloudCover, p.cloudCover, (v) => collection.setProperties(id, {cloudCover: v}));
        numberField('prop-temp', 'Temperature', 'missing', p.temperature, (v) => collection.setProperties(id, {temperature: v}), null);
        numberField('prop-dew', 'Dew point', 'missing', p.dewPoint, (v) => collection.setProperties(id, {dewPoint: v}), null);
        numberField('prop-pressure', 'Sea-level pressure (hPa)', 'e.g. 1013.2', p.pressure, (v) => collection.setProperties(id, {pressure: v}));
        numberField('prop-change', 'Pressure change (hPa)', 'e.g. 1.9', p.pressureChange, (v) => collection.setProperties(id, {pressureChange: v}), null);
        choice('prop-tendency', 'Pressure tendency', pick.pressureTendency, p.pressureTendency, (v) => collection.setProperties(id, {pressureTendency: v}));
        choice('prop-weather', 'Present weather', pick.weather, p.weather, (v) => collection.setProperties(id, {weather: v}));
    }

    // What the library finds wrong with the graphic, said plainly rather than drawn silently.
    const problems = validateMetocFeature(f);
    if (problems.length) {
        const warn = document.createElement('p');
        warn.className = 'warning';
        warn.id = 'prop-problems';
        warn.textContent = `Check: ${problems.join('; ')}.`;
        panel.append(warn);
    }

    if (fields.color) {
        const label = document.createElement('label');
        label.textContent = 'Colour';
        const row = document.createElement('div');
        row.className = 'swatches';
        if (fields.color === 'any') {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = toHex(p.color ?? colorOf(s.colors[0]));
            input.addEventListener('input', () => {
                collection.setProperties(id, {color: input.value});
                checkpointSoon();
            });
            const reset = document.createElement('button');
            reset.type = 'button';
            reset.textContent = 'Standard';
            reset.addEventListener('click', () => {
                collection.setProperties(id, {color: undefined});
                history.checkpoint();
                renderProperties(true);
            });
            row.append(input, reset);
        } else {
            for (const role of fields.color) {
                const b = document.createElement('button');
                b.type = 'button';
                const color = colorOf(role);
                b.textContent = METOC_COLOR_ROLE_NAMES[role];
                b.style.borderLeft = `14px solid ${color}`;
                b.setAttribute('aria-pressed', String(p.color ? toHex(p.color) === toHex(color) : role === s.colors[0]));
                // The standard's own colour is stored as no colour at all.
                b.addEventListener('click', () => {
                    collection.setProperties(id, {color: role === s.colors[0] ? undefined : color});
                    history.checkpoint();
                    renderProperties(true);
                });
                row.append(b);
            }
        }
        panel.append(label, row);
    }

    const check = (label: string, checked: boolean, write: (v: boolean | undefined) => void) => {
        const l = document.createElement('label');
        l.className = 'check';
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = checked;
        box.addEventListener('change', () => {
            write(box.checked || undefined);
            history.checkpoint();
        });
        l.append(box, document.createTextNode(` ${label}`));
        panel.append(l);
    };
    if (fields.dashed) check('Dashed', p.dashed === true, (v) => collection.setProperties(id, {dashed: v}));
    if (fields.filled) check('Filled, no outline', p.filled === true, (v) => collection.setProperties(id, {filled: v}));
    if (fields.size) {
        // Small, medium or large. No size follows the Settings default, so choosing the default clears it.
        const label = document.createElement('div');
        label.textContent = 'Size';
        const sizes = document.createElement('div');
        sizes.className = 'row';
        for (const size of ['small', 'medium', 'large'] as const) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = size[0].toUpperCase() + size.slice(1);
            b.setAttribute('aria-pressed', String((p.size ?? getMetocConfig().pointSize) === size));
            b.addEventListener('click', () => {
                collection.setProperties(id, {size: size === getMetocConfig().pointSize ? undefined : size});
                history.checkpoint();
                renderProperties(true);
            });
            sizes.append(b);
        }
        panel.append(label, sizes);
    }

    const row = document.createElement('div');
    row.className = 'row';
    if (s.geometry === 'line') {
        // Flipping is a line's business: it moves the pips. An area or a point has no side.
        const flip = document.createElement('button');
        flip.type = 'button';
        flip.textContent = 'Flip side';
        flip.dataset.icon = 'flip';
        flip.title = 'Reverse the points, which moves the pips to the other side';
        flip.addEventListener('click', () => {
            const current = collection.get(id);
            if (current) collection.setPoints(id, drawnPoints(flipMetocFeature(current)));
            history.checkpoint();
        });
        row.append(flip);
    }
    const dup = document.createElement('button');
    dup.type = 'button';
    dup.textContent = 'Duplicate';
    dup.title = 'Duplicate (Ctrl+D)';
    dup.dataset.icon = 'copy';
    dup.addEventListener('click', () => interaction.duplicateSelected());
    row.append(dup);
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'danger';
    del.textContent = 'Delete';
    del.dataset.icon = 'trash';
    del.addEventListener('click', () => interaction.deleteSelected());
    row.append(del);
    panel.append(row);
    decorateIcons(panel);
    if (focused?.id) {
        const again = document.getElementById(focused.id);
        if (again instanceof HTMLInputElement) {
            again.focus();
            if (caret && again.type === 'text') again.setSelectionRange(caret[0], caret[1]);
        }
    }
}

function toHex(color: string): string {
    const m = color.match(/\d+/g);
    if (!color.startsWith('rgb') || !m) return color.startsWith('#') ? color : '#000000';
    return '#' + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('');
}

interaction.subscribe((e) => {
    if (e.type === 'commit') history.checkpoint();
    if (e.type === 'rejected') {
        $('#status').textContent = e.reason;
        return;
    }
    renderStatus();
    renderProperties();
});

// ── undo and redo ──────────────────────────────────────────────────────────────

let checkpointTimer = 0;
/** Record an undo step once a burst of edits (typing, a colour drag) has settled. */
function checkpointSoon(): void {
    clearTimeout(checkpointTimer);
    checkpointTimer = window.setTimeout(() => {
        checkpointTimer = 0;
        history.checkpoint();
    }, 600);
}

/**
 * Record a pending typed edit *before* the next action starts. Without this, typing a value and
 * then pressing Delete within the pause recorded only "deleted", and undo brought the graphic back
 * without what had been typed. Capture phase, so it runs before the action's own handler.
 */
function flushPendingEdit(): void {
    if (!checkpointTimer) return;
    clearTimeout(checkpointTimer);
    checkpointTimer = 0;
    history.checkpoint();
}
window.addEventListener('pointerdown', flushPendingEdit, true);
window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.ctrlKey || e.metaKey || !(e.target instanceof HTMLInputElement)) flushPendingEdit();
}, true);

function renderHistory(): void {
    $<HTMLButtonElement>('#undo').disabled = !history.canUndo;
    $<HTMLButtonElement>('#redo').disabled = !history.canRedo;
}
history.subscribe(() => {
    renderHistory();
    renderProperties(true);
});

function undo(): void {
    interaction.cancelDrawing();
    flushPendingEdit();
    history.undo();
}

function redo(): void {
    interaction.cancelDrawing();
    history.redo();
}

$('#undo').addEventListener('click', undo);
$('#redo').addEventListener('click', redo);
window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) undo();
    else if (k === 'y' || (k === 'z' && e.shiftKey)) redo();
    else return;
    e.preventDefault();
});

// ── keyboard shortcuts ──────────────────────────────────────────────────────────

const helpPanel = $('#help');
$('#help-toggle').addEventListener('click', (e) => {
    helpPanel.hidden = !helpPanel.hidden;
    (e.currentTarget as HTMLElement).setAttribute('aria-expanded', String(!helpPanel.hidden));
});
window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
    if (e.key === '?') helpPanel.hidden = !helpPanel.hidden;
});

$('#draw-finish').addEventListener('click', () => {
    if (!interaction.finishDrawing()) $('#status').textContent = 'Not enough points yet.';
});
$('#draw-undo-point').addEventListener('click', () => interaction.keyDown('Backspace'));
$('#draw-cancel').addEventListener('click', () => interaction.cancelDrawing());
collection.subscribe(() => {
    renderStatus();
    // The point count in the panel follows edits without stealing focus from an input.
    const points = document.querySelector('#prop-points');
    const f = interaction.selectedId ? collection.get(interaction.selectedId) : undefined;
    if (points && f) points.textContent = String(drawnPoints(f).length);
    if (f) renderPreview(f);
    // An edit can make or mend a problem (a reshaped area that crosses itself).
    if (f) {
        const problems = validateMetocFeature(f);
        const warn = document.querySelector('#prop-problems');
        if (problems.length ? warn?.textContent !== `Check: ${problems.join('; ')}.` : !!warn) renderProperties(true);
    }
});

// ── map controls ──────────────────────────────────────────────────────────────

/** A tilt or turn step, in degrees. */
const TILT_STEP = 15;
$('#zoom-in').addEventListener('click', () => engine?.camera.zoomIn());
$('#zoom-out').addEventListener('click', () => engine?.camera.zoomOut());
$('#tilt-up').addEventListener('click', () => engine?.camera.tilt?.(TILT_STEP));
$('#tilt-down').addEventListener('click', () => engine?.camera.tilt?.(-TILT_STEP));
$('#reset-north').addEventListener('click', () => engine?.camera.resetNorth?.());
// The north button's arrow points to north, as a compass does.
const followBearing = () => {
    const icon = document.querySelector<SVGElement>('#reset-north svg');
    const bearing = engine?.camera.bearing?.() ?? 0;
    if (icon) icon.style.transform = `rotate(${-bearing}deg)`;
    requestAnimationFrame(followBearing);
};
requestAnimationFrame(followBearing);

// ── toolbar ────────────────────────────────────────────────────────────────────

// An add-on's engines join the switch (on a developer's machine only; see addonTypes.ts).
for (const e of demoAddons) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.engine = e.id;
    if (e.icon) b.dataset.icon = e.icon;
    b.textContent = e.label;
    $('.engine').append(b);
}
for (const b of document.querySelectorAll<HTMLButtonElement>('.engine button')) {
    b.addEventListener('click', () => {
        if (engine?.name !== b.dataset.engine) void startEngine(b.dataset.engine as EngineName);
    });
}

// The gallery draws one group at a time: all 345 graphics in one view would be too small to read.
// First in the list, a ready-made scenario to open a demonstration with: a surface analysis over
// the US (fronts, pressure centres, isobars, winds, a thunderstorm, turbulence and icing).
const SCENARIO = 'scenario:surface-analysis';
const SCENARIO_VIEW: ViewState = {center: [-96, 38.5], zoom: 3.7};
const gallerySelect = $<HTMLSelectElement>('#gallery-group');
{
    const opt = document.createElement('option');
    opt.value = SCENARIO;
    opt.textContent = 'Scenario: surface analysis';
    gallerySelect.append(opt);
}
for (const category of CATEGORY_ORDER) {
    const count = listMetocGraphics().filter((n) => getMetocSpec(n).category === category).length;
    if (count === 0) continue;
    const opt = document.createElement('option');
    opt.value = category;
    opt.textContent = `${category} (${count})`;
    gallerySelect.append(opt);
}
gallerySelect.value = readSaved().galleryGroup ?? CATEGORY_ORDER[0];
gallerySelect.addEventListener('change', () => writeSaved({galleryGroup: gallerySelect.value}));

$('#gallery').addEventListener('click', async () => {
    interaction.cancelDrawing();
    interaction.select(null);
    collection.clear();
    if (gallerySelect.value === SCENARIO) {
        // The ready-made surface analysis (public/samples/).
        const analysis = await fetch(`${import.meta.env.BASE_URL}samples/surface-analysis.geojson`).then((r) => r.json());
        collection.load(analysis);
        history.checkpoint();
        // Framed on the analysis: the engine starts again on its view.
        await startEngine(engine.name, SCENARIO_VIEW);
        return;
    }
    const names = listMetocGraphics().filter((n) => getMetocSpec(n).category === gallerySelect.value);
    drawSampleGallery(collection, engine.view, engine.size(), names);
    history.checkpoint();
});

function download(data: BlobPart, type: string, file: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], {type}));
    a.download = file;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('#export').addEventListener('click', () => download(JSON.stringify(collection.toGeoJSON(), null, 2), 'application/geo+json', 'metoc-graphics.geojson'));

// An add-on's tools (on a developer's machine only; see addonTypes.ts).
for (const tool of demoTools) {
    tool.mount({collection, resolution: () => engine.host.resolution(), status: (text) => ($('#status').textContent = text), download, toolbar: $('#addon-tools'), panels: $('.panels')});
}

$<HTMLInputElement>('#import-file').addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
        const {loaded, skipped} = collection.load(JSON.parse(await file.text()));
        history.checkpoint();
        const note = skipped.length ? `, skipped ${skipped.length}: ${skipped.map((s) => `#${s.index} ${s.reason}`).join('; ')}` : '';
        $('#status').textContent = `Imported ${loaded.length} graphic${loaded.length === 1 ? '' : 's'}${note}.`;
    } catch (err) {
        $('#status').textContent = `Could not read ${file.name}: ${(err as Error).message}`;
    }
});

$('#clear').addEventListener('click', () => {
    interaction.cancelDrawing();
    collection.clear();
    history.checkpoint();
});

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]')) {
    b.addEventListener('click', () => {
        themeChoice = b.dataset.themeChoice as ThemeChoice;
        writeSaved({theme: themeChoice});
        applyTheme();
    });
}

// ── settings ───────────────────────────────────────────────────────────────────

const settingsPanel = $('#settings');
$('#settings-toggle').addEventListener('click', (e) => {
    settingsPanel.hidden = !settingsPanel.hidden;
    (e.currentTarget as HTMLElement).setAttribute('aria-expanded', String(!settingsPanel.hidden));
});

function bindRange(id: string, read: () => number, write: (v: number) => void, format = (v: number) => String(v)): void {
    const input = $<HTMLInputElement>(`#${id}`);
    const out = $(`#${id}-out`);
    input.value = String(read());
    out.textContent = format(read());
    input.addEventListener('input', () => {
        write(Number(input.value));
        out.textContent = format(Number(input.value));
    });
}

const DEFAULT_HANDLE_COLOR = 'rgb(255, 140, 0)';
const saveSettings = () => {
    const c = getMetocConfig();
    writeSaved({
        settings: {
            lineWidth: c.lineWidth,
            pipSize: c.pipSize,
            smoothLines: c.smoothLines,
            defaultLineColor: c.defaultLineColor,
            pointSize: c.pointSize,
            basemapOpacity,
            leaderLines,
            showLabels: c.showLabels,
            labelColor: c.labelColor,
            labelFont: c.labelFont,
            allowPointRotation: c.allowPointRotation,
            snap: (interaction.getOptions().snapPx ?? 0) > 0,
            handleColor: c.handleColor === DEFAULT_HANDLE_COLOR ? undefined : c.handleColor,
            pointFullSizeScale: c.pointFullSizeScale,
        },
    });
};

bindRange('line-width', () => getMetocConfig().lineWidth, (v) => {
    configureMetoc({lineWidth: v});
    engine.refresh();
    saveSettings();
}, (v) => `${v}px`);
bindRange('pip-size', () => getMetocConfig().pipSize, (v) => {
    configureMetoc({pipSize: v});
    engine.refresh();
    saveSettings();
}, (v) => `${v}px`);
bindRange('opacity', () => basemapOpacity, (v) => {
    basemapOpacity = v;
    engine.setBasemapOpacity(v);
    saveSettings();
}, (v) => `${Math.round(v * 100)}%`);
// The default point size: every point graphic without a size of its own.
function showPointSize(): void {
    for (const b of document.querySelectorAll<HTMLButtonElement>('#point-size button')) b.setAttribute('aria-pressed', String(b.dataset.pointSize === getMetocConfig().pointSize));
}
for (const b of document.querySelectorAll<HTMLButtonElement>('#point-size button')) {
    b.addEventListener('click', () => {
        if (!isPointSize(b.dataset.pointSize)) return;
        configureMetoc({pointSize: b.dataset.pointSize});
        engine.refresh();
        renderProperties(true);
        showPointSize();
        saveSettings();
    });
}
showPointSize();
// Point symbols shrinking as the map zooms out past a scale; Never keeps them one size.
const shrinkSelect = $<HTMLSelectElement>('#point-shrink');
shrinkSelect.value = String(getMetocConfig().pointFullSizeScale ?? '');
shrinkSelect.addEventListener('change', () => {
    configureMetoc({pointFullSizeScale: shrinkSelect.value ? Number(shrinkSelect.value) : undefined});
    engine.refresh();
    saveSettings();
});
// Leader lines: in 3D, each point symbol upright on a line to its location, clear of the terrain.
const leaderBox = $<HTMLInputElement>('#leader-lines');
leaderBox.checked = leaderLines;
leaderBox.addEventListener('change', () => {
    leaderLines = leaderBox.checked;
    engine?.camera.setLeaderLines?.(leaderLines);
    saveSettings();
});
const smooth = $<HTMLInputElement>('#smooth');
smooth.checked = getMetocConfig().smoothLines;
smooth.addEventListener('change', () => {
    configureMetoc({smoothLines: smooth.checked});
    engine.refresh();
    saveSettings();
});

// The default line colour: what the standard's black is drawn in. Unset, the theme's black (black
// on light, light grey on dark); set, the chosen colour on either theme.
function showLineColor(): void {
    $<HTMLInputElement>('#line-color').value = toHex(getDefaultLineColor());
    $<HTMLButtonElement>('#line-color-reset').disabled = !getMetocConfig().defaultLineColor;
}
const setLineColor = (color: string | undefined) => {
    configureMetoc({defaultLineColor: color});
    engine.refresh();
    renderPicker(searchText());
    renderProperties(true);
    showLineColor();
    saveSettings();
};
$<HTMLInputElement>('#line-color').addEventListener('input', (e) => setLineColor((e.target as HTMLInputElement).value));
$('#line-color-reset').addEventListener('click', () => setLineColor(undefined));
showLineColor();

// Labels: shown or not, their colour (Standard: each graphic's own), their font.
const labelsBox = $<HTMLInputElement>('#show-labels');
labelsBox.checked = getMetocConfig().showLabels;
labelsBox.addEventListener('change', () => {
    configureMetoc({showLabels: labelsBox.checked});
    engine.refresh();
    saveSettings();
});
function showLabelColor(): void {
    $<HTMLInputElement>('#label-color').value = toHex(getMetocConfig().labelColor ?? getDefaultLineColor());
    $<HTMLButtonElement>('#label-color-reset').disabled = !getMetocConfig().labelColor;
}
const setLabelColor = (color: string | undefined) => {
    configureMetoc({labelColor: color});
    engine.refresh();
    showLabelColor();
    saveSettings();
};
$<HTMLInputElement>('#label-color').addEventListener('input', (e) => setLabelColor((e.target as HTMLInputElement).value));
$('#label-color-reset').addEventListener('click', () => setLabelColor(undefined));
showLabelColor();
const fontSelect = $<HTMLSelectElement>('#label-font');
fontSelect.value = getMetocConfig().labelFont ?? '';
fontSelect.addEventListener('change', () => {
    configureMetoc({labelFont: fontSelect.value || undefined});
    engine.refresh();
    saveSettings();
});

// Editing: turning point symbols, snapping, the handle colour.
const rotationBox = $<HTMLInputElement>('#point-rotation');
rotationBox.checked = getMetocConfig().allowPointRotation;
rotationBox.addEventListener('change', () => {
    configureMetoc({allowPointRotation: rotationBox.checked});
    interaction.setOptions({});
    saveSettings();
});
const snapBox = $<HTMLInputElement>('#snap');
snapBox.checked = (interaction.getOptions().snapPx ?? 0) > 0;
snapBox.addEventListener('change', () => {
    interaction.setOptions({snapPx: snapBox.checked ? SNAP_PX : 0});
    saveSettings();
});
function showHandleColor(): void {
    $<HTMLInputElement>('#handle-color').value = toHex(getMetocConfig().handleColor);
    $<HTMLButtonElement>('#handle-color-reset').disabled = getMetocConfig().handleColor === DEFAULT_HANDLE_COLOR;
}
const setHandleColor = (color: string) => {
    configureMetoc({handleColor: color});
    interaction.setOptions({});
    showHandleColor();
    saveSettings();
};
$<HTMLInputElement>('#handle-color').addEventListener('input', (e) => setHandleColor((e.target as HTMLInputElement).value));
$('#handle-color-reset').addEventListener('click', () => setHandleColor(DEFAULT_HANDLE_COLOR));
showHandleColor();

$<HTMLInputElement>('#search').addEventListener('input', (e) => renderPicker((e.target as HTMLInputElement).value));

// ── go ─────────────────────────────────────────────────────────────────────────

decorateIcons();
// An engine saved with an add-on loaded may not be offered now.
const offered = (name: string | undefined) => !!name && (['openlayers', 'maplibre', 'maplibre3d'].includes(name) || demoAddons.some((e) => e.id === name));
void startEngine(offered(saved.engine) ? saved.engine! : 'openlayers');
applyTheme();
renderStatus();
renderHistory();

// A hook for the Playwright driver. App code never reads it.
if (import.meta.env.DEV) {
    (window as unknown as {__metoc: unknown}).__metoc = {collection, interaction, history, engine: () => engine, startEngine};
}
