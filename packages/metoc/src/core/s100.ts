/**
 * # Reading S-411 and S-412 data
 *
 * An S-100 GML dataset (S-100 Part 10b) of S-412 Marine Weather Warnings or S-411 Ice Information,
 * read into METOC graphics: each feature becomes the catalog entry that portrays it, its geometry
 * the drawn points, and every attribute it carries kept in `properties.metoc.s100`. What has no
 * graphic (a data coverage, a feature this library does not draw yet) is listed as skipped, with
 * the reason, never dropped silently.
 *
 * The reader parses XML itself, so it runs wherever the rest of the package does (a browser, a
 * worker, Node), with no DOM.
 */

import type {Position} from 'geojson';
import {METOC_GRAPHICS, listMetocGraphics, type MetocGraphicName} from './catalog.js';
import {metocFeature, type MetocFeature, type MetocProperties} from './types.js';

// ── a small XML reader ─────────────────────────────────────────────────────────

/** An XML element with namespace prefixes dropped from its name and its attributes' names. */
export interface XmlElement {
    name: string;
    attrs: Record<string, string>;
    children: XmlElement[];
    text: string;
}

const ENTITIES: Record<string, string> = {lt: '<', gt: '>', amp: '&', quot: '"', apos: "'"};
const has = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key);

function decode(s: string): string {
    return s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e: string) => {
        if (e[0] === '#') {
            const n = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
            return isFinite(n) ? String.fromCodePoint(n) : m;
        }
        return has(ENTITIES, e) ? ENTITIES[e] : m;
    });
}

const local = (qname: string) => qname.slice(qname.indexOf(':') + 1);

const SPACE = /\s/;
const isSpace = (c: string) => SPACE.test(c);

/**
 * A start tag's `name="value"` pairs, in one pass. A token that is not followed by `=` and a quoted
 * value is skipped. Scanned by hand: a regular expression backtracked over a long token with no
 * `=`, which made one hostile tag take seconds.
 */
function attributes(rest: string): [string, string][] {
    const out: [string, string][] = [];
    const n = rest.length;
    let i = 0;
    while (i < n) {
        while (i < n && isSpace(rest[i])) i++;
        const start = i;
        while (i < n && rest[i] !== '=' && !isSpace(rest[i])) i++;
        const name = rest.slice(start, i);
        let j = i;
        while (j < n && isSpace(rest[j])) j++;
        if (!name || rest[j] !== '=') {
            if (i === start) i++;
            continue;
        }
        j++;
        while (j < n && isSpace(rest[j])) j++;
        const quote = rest[j];
        if (quote !== '"' && quote !== "'") {
            i = j;
            continue;
        }
        const end = rest.indexOf(quote, j + 1);
        if (end < 0) break;
        out.push([name, rest.slice(j + 1, end)]);
        i = end + 1;
    }
    return out;
}

/**
 * Parse XML into elements: enough of XML for GML (declarations, comments, CDATA and a DOCTYPE are
 * skipped or read; entities are decoded). Throws on a document that is not well formed.
 */
export function parseXml(xml: string): XmlElement {
    const root: XmlElement = {name: '#document', attrs: {}, children: [], text: ''};
    const stack: XmlElement[] = [root];
    let i = 0;
    const n = xml.length;
    while (i < n) {
        const lt = xml.indexOf('<', i);
        if (lt < 0) {
            stack[stack.length - 1].text += decode(xml.slice(i));
            break;
        }
        if (lt > i) stack[stack.length - 1].text += decode(xml.slice(i, lt));
        if (xml.startsWith('<!--', lt)) {
            const end = xml.indexOf('-->', lt + 4);
            if (end < 0) throw new Error('Unterminated comment');
            i = end + 3;
        } else if (xml.startsWith('<![CDATA[', lt)) {
            const end = xml.indexOf(']]>', lt + 9);
            if (end < 0) throw new Error('Unterminated CDATA section');
            stack[stack.length - 1].text += xml.slice(lt + 9, end);
            i = end + 3;
        } else if (xml.startsWith('<?', lt)) {
            const end = xml.indexOf('?>', lt + 2);
            if (end < 0) throw new Error('Unterminated processing instruction');
            i = end + 2;
        } else if (xml.startsWith('<!', lt)) {
            // A DOCTYPE, possibly with an internal subset in brackets.
            let depth = 0;
            let j = lt + 2;
            for (; j < n; j++) {
                if (xml[j] === '[') depth++;
                else if (xml[j] === ']') depth--;
                else if (xml[j] === '>' && depth <= 0) break;
            }
            i = j + 1;
        } else if (xml[lt + 1] === '/') {
            const end = xml.indexOf('>', lt);
            if (end < 0) throw new Error('Unterminated end tag');
            const name = local(xml.slice(lt + 2, end).trim());
            const open = stack.pop();
            if (!open || open === root || open.name !== name) throw new Error(`Mismatched end tag </${name}>`);
            i = end + 1;
        } else {
            // A start tag: scan to its '>' outside quotes.
            let j = lt + 1;
            let quote = '';
            for (; j < n; j++) {
                const c = xml[j];
                if (quote) {
                    if (c === quote) quote = '';
                } else if (c === '"' || c === "'") quote = c;
                else if (c === '>') break;
            }
            if (j >= n) throw new Error('Unterminated start tag');
            let body = xml.slice(lt + 1, j);
            const selfClosing = body.endsWith('/');
            if (selfClosing) body = body.slice(0, -1);
            const nameEnd = body.search(/\s|$/);
            const el: XmlElement = {name: local(body.slice(0, nameEnd)), attrs: {}, children: [], text: ''};
            for (const [qname, value] of attributes(body.slice(nameEnd))) {
                if (qname.startsWith('xmlns')) continue;
                el.attrs[local(qname)] = decode(value);
            }
            stack[stack.length - 1].children.push(el);
            if (!selfClosing) stack.push(el);
            i = j + 1;
        }
    }
    if (stack.length !== 1) throw new Error(`Unclosed element <${stack[stack.length - 1].name}>`);
    const doc = root.children[0];
    if (!doc) throw new Error('No root element');
    return doc;
}

const child = (el: XmlElement | undefined, name: string) => el?.children.find((c) => c.name === name);

function descendant(el: XmlElement, name: string): XmlElement | undefined {
    for (const c of el.children) {
        if (c.name === name) return c;
        const d = descendant(c, name);
        if (d) return d;
    }
    return undefined;
}

// ── the dataset ────────────────────────────────────────────────────────────────

/** The S-100 products this reader knows. */
export type S100Product = 'S-411' | 'S-412';

export interface S100ReadOptions {
    /**
     * The order of each coordinate pair. S-100 GML is in EPSG:4326, latitude first, which is the
     * default; `'lonlat'` reads data written longitude first.
     */
    axisOrder?: 'latlon' | 'lonlat';
    /**
     * Which WMO colour code an S-411 sea-ice area is drawn in: by its total concentration (the
     * default) or by its stage of development (the first one the area lists). A lake-ice area is
     * always drawn by its concentration: its stages are not the sea-ice codes.
     */
    iceColorCode?: 'concentration' | 'stageOfDevelopment';
}

/** A feature the dataset has and the reader made no graphic of, and why. */
export interface S100Skipped {
    /** The feature's `gml:id`, where it has one. */
    id?: string;
    /** Its S-100 feature type. */
    feature: string;
    reason: string;
}

export interface S100ReadResult {
    /** From the dataset's identification; undefined when it names neither product. */
    product?: S100Product;
    /** The dataset's `productEdition`, as written. */
    edition?: string;
    features: MetocFeature[];
    skipped: S100Skipped[];
    /** Graphics drawn on an assumption the data did not state, each with the reason. */
    warnings: string[];
}

/** Elements that are a feature's machinery, not attributes to keep. */
const NOT_ATTRIBUTES = new Set(['geometry', 'boundedBy', 'name', 'description', 'featureObjectIdentifier']);

/** Children of a dataset that are not its members. */
const NOT_MEMBERS = new Set(['DatasetIdentificationInformation', 'DatasetStructureInformation', 'boundedBy', 'name', 'description', 'metaDataProperty']);

/** Feature and information types that hold no picture of their own. */
const METADATA = new Set(['DataCoverage', 'QualityOfNonBathymetricData', 'DataProvider', 'WeatherWarning']);

/** An attribute's value: an enumeration's code, a number, or text. */
function valueOf(el: XmlElement): string | number | undefined {
    const code = el.attrs.code;
    if (code !== undefined && /^-?\d+(\.\d+)?$/.test(code.trim())) return Number(code);
    const text = el.text.trim();
    if (text === '') return undefined;
    return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text;
}

/** Every simple attribute under `el`, complex ones flattened with dotted names. */
function attributesOf(el: XmlElement, prefix = '', out: Record<string, string | number> = {}): Record<string, string | number> {
    for (const c of el.children) {
        if (!prefix && NOT_ATTRIBUTES.has(c.name)) continue;
        const key = prefix ? `${prefix}.${c.name}` : c.name;
        if (c.attrs.href !== undefined && !c.children.length) {
            out[key] = c.attrs.href;
            continue;
        }
        if (c.children.length) {
            attributesOf(c, key, out);
            continue;
        }
        const v = valueOf(c);
        if (v === undefined) continue;
        out[key] = has(out, key) ? `${out[key]}, ${v}` : v;
    }
    return out;
}

/** The first code of an attribute, also when it was given more than once. */
function firstCode(attrs: Record<string, string | number>, key: string): number | undefined {
    const v = attrs[key];
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
        const n = parseInt(v, 10);
        return isFinite(n) ? n : undefined;
    }
    return undefined;
}

/** An `srsDimension`: 2, 3 or 4 coordinates a position; anything else is the `fallback`. */
function dimensionOf(value: string | undefined, fallback: number): number {
    const d = Number(value);
    return Number.isInteger(d) && d >= 2 && d <= 4 ? d : fallback;
}

function positions(text: string, order: 'latlon' | 'lonlat', dims = 2): Position[] {
    const nums = text.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const out: Position[] = [];
    for (let k = 0; k + 1 < nums.length; k += dims) {
        const [a, b] = [nums[k], nums[k + 1]];
        if (!isFinite(a) || !isFinite(b)) continue;
        out.push(order === 'latlon' ? [b, a] : [a, b]);
    }
    return out;
}

/** The dataset's elements by `gml:id`, for geometry given by reference (`xlink:href="#id"`). */
type ById = Map<string, XmlElement>;

/** GML geometry objects: read where a feature's geometry names them, never features themselves. */
const GEOMETRY = new Set([
    'Point', 'MultiPoint', 'Curve', 'OrientableCurve', 'CompositeCurve', 'LineString', 'MultiCurve',
    'Surface', 'Polygon', 'MultiSurface', 'CompositeSurface', 'OrientableSurface', 'Ring', 'LinearRing',
]);

/** How deep a geometry is read, references included, before the reader gives up: a cycle never ends. */
const MAX_DEPTH = 256;

/** Raised while reading a geometry the reader cannot finish: `reason` says why. */
class UnreadableGeometry extends Error {
    constructor(readonly reason: string) {
        super(reason);
    }
}

const tooDeep = () => new UnreadableGeometry(`its geometry nests or refers more than ${MAX_DEPTH} levels deep (a reference loop?)`);

/** An element, or the one it refers to when it is an empty `xlink:href` property. */
function resolved(el: XmlElement, byId: ById, depth: number): XmlElement {
    let e = el;
    for (let k = 0; e.attrs.href !== undefined && !e.children.length; k++) {
        const href = e.attrs.href;
        const target = href.startsWith('#') ? byId.get(href.slice(1)) : undefined;
        if (!target) throw new UnreadableGeometry(`its geometry refers to ${href}, which the dataset does not hold`);
        if (k + depth > MAX_DEPTH) throw tooDeep();
        e = target;
    }
    return e;
}

/** Appends `more` to `line`, dropping its first point when it repeats the last one (a joint). */
function join(line: Position[], more: Position[]): void {
    const last = line[line.length - 1];
    const start = last && more.length && more[0][0] === last[0] && more[0][1] === last[1] ? 1 : 0;
    for (let k = start; k < more.length; k++) line.push(more[k]);
}

/**
 * The positions under `el`, in document order: a `posList`, `pos` elements, `coordinates`, or the
 * segments of a curve and the members of a ring or composite curve joined end to end. An
 * `OrientableCurve` with orientation `-` is read backwards; a property given by reference is read
 * where it points.
 */
function lineOf(el: XmlElement, order: 'latlon' | 'lonlat', byId: ById, dims = 2, depth = 0): Position[] {
    const e = resolved(el, byId, depth);
    const d = dimensionOf(e.attrs.srsDimension, dims);
    if (e.name === 'posList' || e.name === 'pos' || e.name === 'coordinates') return positions(e.text, order, d);
    if (depth > MAX_DEPTH) throw tooDeep();
    const out: Position[] = [];
    for (const c of e.children) join(out, lineOf(c, order, byId, d, depth + 1));
    if (e.name === 'OrientableCurve' && e.attrs.orientation?.trim() === '-') out.reverse();
    return out;
}

/** The elements named in `names` under `el` (references followed), not looking inside a match. */
function partsOf(el: XmlElement, names: Set<string>, byId: ById, depth = 0): XmlElement[] {
    const out: XmlElement[] = [];
    if (depth > MAX_DEPTH) throw tooDeep();
    for (const c of el.children) {
        const e = resolved(c, byId, depth);
        if (names.has(e.name)) out.push(e);
        else out.push(...partsOf(e, names, byId, depth + 1));
    }
    return out;
}

const SURFACE_PARTS = new Set(['Polygon', 'PolygonPatch']);
const CURVE_PARTS = new Set(['LineString', 'Curve', 'OrientableCurve', 'CompositeCurve']);
const POINT_PARTS = new Set(['Point']);

interface Geometry {
    kind: 'point' | 'line' | 'area';
    /** One list of drawn points per part: a multi-surface's surfaces, a multi-curve's curves. */
    parts: Position[][];
    /** Interior rings, which an area of one ring cannot draw. */
    holes: number;
}

/**
 * A feature's geometry as drawn points, part by part, and its kind: every surface of a
 * `MultiSurface` and every patch of a `Surface` is an area of its own, as is every curve of a
 * `MultiCurve` and every point of a `MultiPoint`. Undefined when it has none; throws
 * `UnreadableGeometry` when it refers to geometry the dataset does not hold, or loops.
 */
function geometryOf(feature: XmlElement, order: 'latlon' | 'lonlat', byId: ById): Geometry | undefined {
    const geom = child(feature, 'geometry') ?? feature;
    const surfaces = partsOf(geom, SURFACE_PARTS, byId);
    if (surfaces.length) {
        let holes = 0;
        const parts = surfaces.map((surface) => {
            const exterior = child(surface, 'exterior');
            holes += surface.children.filter((c) => c.name === 'interior').length;
            const ring = exterior ? lineOf(exterior, order, byId) : [];
            const first = ring[0];
            const last = ring[ring.length - 1];
            if (ring.length > 1 && first[0] === last[0] && first[1] === last[1]) ring.pop();
            return ring;
        });
        return {kind: 'area', parts, holes};
    }
    const curves = partsOf(geom, CURVE_PARTS, byId);
    if (curves.length) return {kind: 'line', parts: curves.map((c) => lineOf(c, order, byId)), holes: 0};
    const points = partsOf(geom, POINT_PARTS, byId);
    if (points.length) return {kind: 'point', parts: points.map((p) => lineOf(p, order, byId).slice(0, 1)), holes: 0};
    return undefined;
}

/** The catalog's S-41x entries by the S-100 feature they portray. */
function entriesFor(product: S100Product | undefined, feature: string): MetocGraphicName[] {
    return listMetocGraphics().filter((n) => {
        const spec = METOC_GRAPHICS[n];
        return spec.s100?.feature === feature && (!product || spec.source === product);
    });
}

function byCode(candidates: MetocGraphicName[], attribute: string, code: number | undefined): MetocGraphicName | undefined {
    if (code === undefined) return undefined;
    return candidates.find((n) => METOC_GRAPHICS[n].s100?.attribute === attribute && METOC_GRAPHICS[n].s100?.codes?.includes(code));
}

/** The direction codes S-411 uses for ice drift and sastrugi, as bearings: 2 NE … 9 N. */
const BEARING: Record<number, number> = {2: 45, 3: 90, 4: 135, 5: 180, 6: 225, 7: 270, 8: 315, 9: 0};

interface Picked {
    name: MetocGraphicName;
    extra?: Omit<MetocProperties, 'name' | 's100'>;
    warning?: string;
}

/** Why a feature gets no graphic. */
interface Skip {
    skip: string;
}

/**
 * The graphic for an S-411 point feature that needs its attributes read: the Appendix M symbol for
 * it where Appendix M draws the WMO symbol it stands for (the ice-chart point symbols are WMO's,
 * and so are Appendix M's ice symbols), or an S-411 symbol with its value. Undefined for a feature
 * whose catalog entry names it directly.
 */
function s411Point(feature: string, attrs: Record<string, string | number>): Picked | Skip | undefined {
    const count = firstCode(attrs, 'numberofIceObjects') ?? 1;
    switch (feature) {
        case 'Iceberg': {
            const size = firstCode(attrs, 'icebergSize');
            if (size === 7 || size === 8) return {name: 'IceIsland'};
            if (size === 1 || size === 2) return {name: count > 1 ? 'ManyBergyBits' : 'BergyBit', warning: size === 1 ? 'A growler is drawn as a bergy bit, the smallest iceberg symbol Appendix M has.' : undefined};
            return {name: count > 1 ? 'ManyIcebergs' : 'IcebergGeneral'};
        }
        case 'Floeberg':
            return {name: 'Floeberg'};
        case 'IceDrift': {
            const bearing = BEARING[firstCode(attrs, 'iceDriftDirection') ?? 0];
            if (bearing === undefined) return {skip: 'no drift direction (no motion, variable or unknown), so no drift arrow to draw'};
            // Appendix M's ice drift arrow points east; turned clockwise to the bearing.
            const rotation = (bearing - 90 + 360) % 360;
            return {name: 'IceDrift', extra: rotation ? {rotation} : {}};
        }
        case 'IceShear':
            return {name: 'IceShearing'};
        case 'IceDivergence':
            return {name: 'IceDivergence'};
        case 'IceCompacting':
            return {name: 'IceConvergence'};
        case 'IceRidgeHummock':
            return {name: 'RidgesHummocks'};
        case 'IceRafting':
            return {name: 'Rafting'};
        case 'JammedBrashBarrier':
            return {name: 'JammedBrashBarrier'};
        case 'SnowCover':
            return {name: 'SnowCover'};
        case 'IceThickness': {
            const thickness = firstCode(attrs, 'iceAverageThickness') ?? firstCode(attrs, 'maximumIceThickness');
            const extra = thickness !== undefined ? {value: String(thickness)} : {};
            return {name: firstCode(attrs, 'iceThicknessType') === 1 ? 'IceThicknessObserved' : 'IceThicknessEstimated', extra};
        }
        case 'StageOfMelt': {
            const stage = firstCode(attrs, 'meltStage');
            return {name: 'S411StageOfMelt', extra: stage !== undefined && stage !== 99 ? {value: String(stage)} : {}};
        }
        default:
            return undefined;
    }
}

function pickGraphic(product: S100Product | undefined, feature: string, attrs: Record<string, string | number>, options: S100ReadOptions): Picked | Skip {
    if (product === 'S-411' && (feature === 'SeaIce' || feature === 'LakeIce')) {
        const candidates = entriesFor('S-411', 'SeaIce');
        if (options.iceColorCode === 'stageOfDevelopment' && feature === 'SeaIce') {
            const code = firstCode(attrs, 'iceStageofDevelopment');
            const name = byCode(candidates, 'iceStageofDevelopment', code);
            if (name) return {name};
            return {name: 'S411StageUnknown', warning: code === undefined ? 'A sea-ice area with no stage of development is drawn as undetermined.' : `Stage of development ${code} has no WMO colour; drawn as undetermined.`};
        }
        const code = firstCode(attrs, 'totalConcentration');
        const name = byCode(candidates, 'totalConcentration', code);
        if (name) return {name};
        return {name: 'S411ConcentrationUnknown', warning: code === undefined ? `A ${feature === 'LakeIce' ? 'lake' : 'sea'}-ice area with no total concentration is drawn as undetermined.` : `Total concentration ${code} has no WMO colour; drawn as undetermined.`};
    }
    if (product === 'S-411') {
        const point = s411Point(feature, attrs);
        if (point) return point;
    }
    const candidates = entriesFor(product, feature);
    if (candidates.length) {
        const attribute = METOC_GRAPHICS[candidates[0]].s100?.attribute;
        if (!attribute) return {name: candidates[0]};
        const code = firstCode(attrs, attribute);
        const name = byCode(candidates, attribute, code);
        if (name) return {name};
        return {skip: code === undefined ? `no ${attribute}` : `${attribute} ${code} is not one the product defines`};
    }
    return {skip: 'not a feature this library draws'};
}

/** The text of a DataProvider's issuing service, in the dataset's language or the first given. */
function providerName(provider: XmlElement): string | undefined {
    const service = descendant(provider, 'issuingServiceName') ?? descendant(provider, 'agencyName');
    if (!service) return undefined;
    const text = descendant(service, 'text');
    return (text ?? service).text.trim() || undefined;
}

/**
 * Read an S-411 or S-412 GML dataset into METOC graphics. Each feature becomes the graphic its
 * product's portrayal draws (an S-412 warning by its threshold, an S-411 ice area by its WMO colour
 * code, an S-411 ice symbol as the Appendix M symbol for it), with every attribute it carries in
 * `properties.metoc.s100`; the rest are listed in `skipped`. Add the features to a
 * `MetocCollection` to draw them. Throws if the text is not XML.
 */
export function readS100Dataset(xml: string, options: S100ReadOptions = {}): S100ReadResult {
    const doc = parseXml(xml);
    const order = options.axisOrder ?? 'latlon';
    const ident = child(doc, 'DatasetIdentificationInformation');
    const productId = child(ident, 'productIdentifier')?.text.trim();
    const product: S100Product | undefined = productId === 'S-411' || productId === 'S-412' ? productId : undefined;
    const edition = child(ident, 'productEdition')?.text.trim() || undefined;
    const result: S100ReadResult = {product, edition, features: [], skipped: [], warnings: []};
    if (!product) result.warnings.push(productId ? `The dataset is ${productId}, not S-411 or S-412; read by feature name only.` : 'The dataset names no product; read by feature name only.');

    // Members: under <members>, <member> or <imember> wrappers, or directly under the dataset. A
    // geometry object among them is read where a feature refers to it, not as a feature.
    const members: XmlElement[] = [];
    for (const c of doc.children) {
        if (c.name === 'members' || c.name === 'member' || c.name === 'imember') members.push(...c.children);
        else if (!NOT_MEMBERS.has(c.name)) members.push(c);
    }
    const byId: ById = new Map();
    const stack = [doc];
    while (stack.length) {
        const e = stack.pop()!;
        if (e.attrs.id !== undefined && !byId.has(e.attrs.id)) byId.set(e.attrs.id, e);
        for (let k = e.children.length - 1; k >= 0; k--) stack.push(e.children[k]);
    }

    for (const el of members) {
        const id = el.attrs.id;
        if (GEOMETRY.has(el.name)) continue;
        if (METADATA.has(el.name)) {
            if (el.name === 'DataCoverage') result.skipped.push({id, feature: el.name, reason: 'the data coverage is metadata, not a graphic'});
            continue;
        }
        const attrs = attributesOf(el);
        if (id) attrs.id = id;
        // An S-412 warning names its issuing service by reference.
        for (const [k, v] of Object.entries(attrs)) {
            if (typeof v === 'string' && v.startsWith('#') && k.endsWith('dataProviderInformation')) {
                const provider = byId.get(v.slice(1));
                const name = provider && providerName(provider);
                if (name) attrs.issuingService = name;
                delete attrs[k];
            }
        }
        let geometry: Geometry | undefined;
        try {
            geometry = geometryOf(el, order, byId);
        } catch (e) {
            if (!(e instanceof UnreadableGeometry)) throw e;
            result.skipped.push({id, feature: el.name, reason: e.reason});
            continue;
        }
        if (!geometry) {
            result.skipped.push({id, feature: el.name, reason: 'no geometry'});
            continue;
        }
        const picked = pickGraphic(product, el.name, attrs, options);
        if ('skip' in picked) {
            result.skipped.push({id, feature: el.name, reason: picked.skip});
            continue;
        }
        const spec = METOC_GRAPHICS[picked.name];
        if (spec.geometry !== geometry.kind) {
            result.skipped.push({id, feature: el.name, reason: `a ${geometry.kind} where ${getKindName(spec.geometry)} is drawn`});
            continue;
        }
        const min = spec.geometry === 'area' ? 3 : spec.geometry === 'line' ? 2 : 1;
        const {parts} = geometry;
        const drawn = parts.filter((points, k) => {
            if (points.length >= min) return true;
            const which = parts.length > 1 ? `part ${k + 1} of ${parts.length}: ` : '';
            result.skipped.push({id, feature: el.name, reason: `${which}${points.length} point(s), fewer than ${getKindName(spec.geometry)} needs`});
            return false;
        });
        if (!drawn.length) continue;
        const label = id ?? el.name;
        if (picked.warning) result.warnings.push(`${label}: ${picked.warning}`);
        if (parts.length > 1) result.warnings.push(`${label}: ${parts.length} ${PART_NAMES[geometry.kind]}, drawn as ${drawn.length} ${KIND_PLURALS[spec.geometry]}.`);
        if (geometry.holes) result.warnings.push(`${label}: ${geometry.holes} interior ring(s) not drawn; an area is one ring.`);
        for (const points of drawn) result.features.push(metocFeature(picked.name, points, {...picked.extra, s100: {...attrs}}));
    }
    return result;
}

const getKindName = (kind: 'point' | 'line' | 'area') => (kind === 'area' ? 'an area' : `a ${kind}`);
const PART_NAMES = {point: 'points', line: 'curves', area: 'surfaces'} as const;
const KIND_PLURALS = {point: 'points', line: 'lines', area: 'areas'} as const;
