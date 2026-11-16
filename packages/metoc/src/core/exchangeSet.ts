/**
 * # S-100 exchange sets and their signatures
 *
 * S-411 and S-412 data travels as an S-100 exchange set (S-100 Part 17): a folder or archive with
 * an exchange catalogue, `CATALOG.XML`, listing each dataset file, and `CATALOG.SIGN`, the
 * catalogue's own signature. Every file is signed (S-100 Part 15), and each signature names a
 * data server certificate that the IHO Scheme Administrator issued.
 *
 * This reads the catalogue and the standalone signature, and verifies a signature against the
 * file's bytes and its certificate chain, with the platform's Web Crypto (`crypto.subtle`, in every
 * browser and in Node), so nothing here needs a dependency. It verifies the ECDSA signatures S-100
 * uses: Part 15's ECDSA-384-SHA2 (P-384, SHA-384, the signature DER-encoded) and the earlier
 * ECDSA over SHA-256. DSA, a signature on another signature, and a signature over encrypted or
 * compressed content are reported as unsupported, never as valid.
 *
 * Reading the archive itself (a ZIP) is the host's: these take the files' text and bytes.
 */

import {parseXml, type XmlElement} from './s100.js';

// ── the catalogue ──────────────────────────────────────────────────────────────

/** A certificate an exchange set carries, as base64 DER, with the id of whoever issued it. */
export interface S100CertificateEntry {
    id: string;
    /** The id of the issuing certificate, or the Scheme Administrator's. */
    issuer?: string;
    /** The certificate, DER. */
    der: Uint8Array;
}

/** One signature on a file. */
export interface S100Signature {
    /** `legacy` (S100_SE_DigitalSignature), `data` (on the file), `signature` (on another signature). */
    kind: 'legacy' | 'data' | 'signature';
    id: string;
    /** The id of the certificate that signed it (or the Scheme Administrator's). */
    certificateRef: string;
    /** What a data signature covers: the plain, compressed or encrypted file. */
    dataStatus?: 'unencrypted' | 'compressed' | 'encrypted';
    /** For a signature on a signature, the signature it signs. */
    signatureRef?: string;
    /** The signature bytes as the catalogue gives them. */
    value: Uint8Array;
}

/** A dataset the catalogue lists. */
export interface S100DatasetEntry {
    /** As the catalogue writes it. */
    fileName: string;
    /** The file's path in the exchange set, `/`-separated with no leading slash. */
    path: string;
    /** `S-411`, `S-412`, … where the catalogue says. */
    product?: string;
    productVersion?: string;
    edition?: number;
    update?: number;
    issueDate?: string;
    /** West, south, east, north, in degrees. */
    bbox?: [number, number, number, number];
    /** A cancellation record: the dataset is withdrawn, and usually no file comes with it. */
    cancelled: boolean;
    /** The file is encrypted (Part 15 data protection). */
    protected: boolean;
    compressed: boolean;
    /** `ECDSA-384-SHA2`, `ECDSA`, `DSA`, as the catalogue says. */
    signatureAlgorithm?: string;
    signatures: S100Signature[];
}

export interface S100ExchangeCatalogue {
    datasets: S100DatasetEntry[];
    /** The Scheme Administrator's id in the certificate block. */
    schemeAdministratorId?: string;
    certificates: S100CertificateEntry[];
}

/** The text of an element, or of the first descendant with any (a `gco:CharacterString`). */
function textOf(el: XmlElement | undefined): string | undefined {
    if (!el) return undefined;
    const t = el.text.trim();
    if (t) return t;
    for (const c of el.children) {
        const d = textOf(c);
        if (d) return d;
    }
    return undefined;
}

const childOf = (el: XmlElement | undefined, name: string) => el?.children.find((c) => c.name === name);

function base64Bytes(text: string): Uint8Array {
    const clean = text.replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new Error('Not base64');
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

/** A catalogue path as one `/`-separated path inside the exchange set. */
function normalisePath(filePath: string | undefined, fileName: string): string {
    const clean = (s: string) =>
        s
            .replace(/^file:\/*/i, '')
            .replace(/\\/g, '/')
            .replace(/^\/+/, '');
    const name = clean(fileName);
    if (!filePath || name.includes('/')) return name;
    const dir = clean(filePath).replace(/\/+$/, '');
    return dir ? `${dir}/${name}` : name;
}

function readCertificates(block: XmlElement | undefined): {schemeAdministratorId?: string; certificates: S100CertificateEntry[]} {
    const certificates: S100CertificateEntry[] = [];
    let schemeAdministratorId: string | undefined;
    for (const c of block?.children ?? []) {
        if (c.name === 'schemeAdministrator') schemeAdministratorId = c.attrs.id;
        else if (c.name === 'certificate' && c.attrs.id && c.text.trim()) certificates.push({id: c.attrs.id, issuer: c.attrs.issuer, der: base64Bytes(c.text)});
    }
    return {schemeAdministratorId, certificates};
}

const SIGNATURE_KINDS: Record<string, S100Signature['kind']> = {S100_SE_DigitalSignature: 'legacy', S100_SE_SignatureOnData: 'data', S100_SE_SignatureOnSignature: 'signature'};

function readSignatures(record: XmlElement): S100Signature[] {
    const unprotected = textOf(childOf(record, 'dataProtection')) !== 'true' && textOf(childOf(record, 'compressionFlag')) !== 'true';
    const out: S100Signature[] = [];
    for (const wrapper of record.children.filter((c) => c.name === 'digitalSignatureValue')) {
        const el = wrapper.children[0];
        if (!el) {
            // An early catalogue puts the base64 value straight in the wrapper.
            if (wrapper.text.trim()) out.push({kind: 'legacy', id: '', certificateRef: '', value: base64Bytes(wrapper.text)});
            continue;
        }
        const typeName = (el.attrs.type ?? el.name).replace(/^.*:/, '');
        const kind = SIGNATURE_KINDS[typeName];
        if (!kind) continue;
        const status = el.attrs.dataStatus as S100Signature['dataStatus'] | undefined;
        out.push({
            kind,
            id: el.attrs.id ?? '',
            certificateRef: el.attrs.certificateRef ?? '',
            dataStatus: kind === 'data' ? (status ?? (unprotected ? 'unencrypted' : undefined)) : undefined,
            signatureRef: el.attrs.signatureRef,
            value: base64Bytes(el.text),
        });
    }
    return out;
}

function bound(el: XmlElement | undefined, name: string): number | undefined {
    const v = Number(textOf(childOf(el, name)));
    return textOf(childOf(el, name)) !== undefined && isFinite(v) ? v : undefined;
}

function readDataset(record: XmlElement): S100DatasetEntry | undefined {
    const fileName = textOf(childOf(record, 'fileName'));
    if (!fileName) return undefined;
    const spec = childOf(record, 'productSpecification');
    const box = childOf(record, 'boundingBox');
    const [w, e, s, n] = ['westBoundLongitude', 'eastBoundLongitude', 'southBoundLatitude', 'northBoundLatitude'].map((k) => bound(box, k));
    const int = (name: string) => {
        const v = parseInt(textOf(childOf(record, name)) ?? '', 10);
        return isFinite(v) ? v : undefined;
    };
    const product = textOf(childOf(spec, 'productIdentifier')) ?? textOf(childOf(spec, 'name'))?.match(/S-\d{3}/)?.[0];
    return {
        fileName,
        path: normalisePath(textOf(childOf(record, 'filePath')), fileName),
        product,
        productVersion: textOf(childOf(spec, 'version')),
        edition: int('editionNumber'),
        update: int('updateNumber'),
        issueDate: textOf(childOf(record, 'issueDate')),
        bbox: w !== undefined && s !== undefined && e !== undefined && n !== undefined ? [w, s, e, n] : undefined,
        cancelled: textOf(childOf(record, 'purpose')) === 'cancellation',
        protected: textOf(childOf(record, 'dataProtection')) === 'true',
        compressed: textOf(childOf(record, 'compressionFlag')) === 'true',
        signatureAlgorithm: textOf(childOf(record, 'digitalSignatureReference')),
        signatures: readSignatures(record),
    };
}

/**
 * Read an exchange catalogue (`CATALOG.XML`), S-100 edition 5 (records under
 * `datasetDiscoveryMetadata`) or the earlier layout (records under the root). Throws if the text is
 * not XML or a certificate or signature is not base64.
 */
export function readS100ExchangeCatalogue(xml: string): S100ExchangeCatalogue {
    const root = parseXml(xml);
    const records: XmlElement[] = [];
    for (const c of root.children) {
        if (c.name === 'datasetDiscoveryMetadata') records.push(...c.children);
        else if (c.name.endsWith('_DatasetDiscoveryMetadata')) records.push(c);
    }
    const datasets = records.map(readDataset).filter((d): d is S100DatasetEntry => !!d);
    return {datasets, ...readCertificates(childOf(root, 'certificates'))};
}

/** A standalone signature (`CATALOG.SIGN`): the file it signs, its certificates, the signature. */
export interface S100StandaloneSignature {
    fileName: string;
    schemeAdministratorId?: string;
    certificates: S100CertificateEntry[];
    signature: S100Signature;
}

/** Read a standalone signature file (Part 15, `CATALOG.SIGN`, `PERMIT.SIGN`). Throws if it is not one. */
export function readS100StandaloneSignature(xml: string): S100StandaloneSignature {
    const root = parseXml(xml);
    if (root.name !== 'StandaloneDigitalSignature') throw new Error(`Not a standalone signature: <${root.name}>`);
    const fileName = textOf(childOf(root, 'filename')) ?? textOf(childOf(root, 'fileName'));
    const sig = childOf(root, 'digitalSignature');
    if (!fileName || !sig) throw new Error('A standalone signature names its file and holds a signature');
    return {
        fileName,
        ...readCertificates(childOf(root, 'certificates')),
        signature: {kind: 'data', dataStatus: 'unencrypted', id: sig.attrs.id ?? '', certificateRef: sig.attrs.certificateRef ?? '', value: base64Bytes(sig.text)},
    };
}

// ── DER and X.509, as far as verifying a chain needs ───────────────────────────

interface Tlv {
    tag: number;
    /** The whole element, header included. */
    raw: Uint8Array;
    /** Its contents. */
    body: Uint8Array;
}

function readTlv(buf: Uint8Array, at = 0): Tlv & {end: number} {
    if (at + 2 > buf.length) throw new Error('DER: truncated');
    const tag = buf[at];
    let len = buf[at + 1];
    let head = 2;
    if (len & 0x80) {
        const n = len & 0x7f;
        if (n === 0 || n > 4 || at + 2 + n > buf.length) throw new Error('DER: bad length');
        len = 0;
        for (let i = 0; i < n; i++) len = len * 256 + buf[at + 2 + i];
        head += n;
    }
    const end = at + head + len;
    if (end > buf.length) throw new Error('DER: truncated');
    return {tag, raw: buf.subarray(at, end), body: buf.subarray(at + head, end), end};
}

function children(body: Uint8Array): Tlv[] {
    const out: Tlv[] = [];
    for (let at = 0; at < body.length; ) {
        const t = readTlv(body, at);
        out.push(t);
        at = t.end;
    }
    return out;
}

function oid(body: Uint8Array): string {
    const parts = [Math.floor(body[0] / 40), body[0] % 40];
    let v = 0;
    for (let i = 1; i < body.length; i++) {
        v = v * 128 + (body[i] & 0x7f);
        if (!(body[i] & 0x80)) {
            parts.push(v);
            v = 0;
        }
    }
    return parts.join('.');
}

function time(t: Tlv): number {
    const s = new TextDecoder().decode(t.body);
    const m = t.tag === 0x17 ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(s) : /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(s);
    if (!m) throw new Error('X.509: bad time');
    let year = Number(m[1]);
    if (t.tag === 0x17) year += year < 50 ? 2000 : 1900;
    return Date.UTC(year, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
}

/** What verifying a certificate chain needs from one certificate. */
interface X509 {
    tbs: Uint8Array;
    signatureOid: string;
    signature: Uint8Array;
    issuer: Uint8Array;
    subject: Uint8Array;
    notBefore: number;
    notAfter: number;
    spki: Uint8Array;
    keyOid: string;
    curveOid?: string;
}

function parseCertificate(der: Uint8Array): X509 {
    const [tbsT, algT, sigT] = children(readTlv(der).body);
    if (!tbsT || !algT || !sigT || sigT.tag !== 0x03) throw new Error('X.509: not a certificate');
    let fields = children(tbsT.body);
    if (fields[0]?.tag === 0xa0) fields = fields.slice(1); // the explicit version
    const [, , issuer, validity, subject, spki] = fields;
    if (!spki) throw new Error('X.509: truncated');
    const [nb, na] = children(validity.body);
    const [keyAlg] = children(spki.body);
    const [keyOidT, paramT] = children(keyAlg.body);
    return {
        tbs: tbsT.raw,
        signatureOid: oid(children(algT.body)[0].body),
        signature: sigT.body.subarray(1),
        issuer: issuer.raw,
        subject: subject.raw,
        notBefore: time(nb),
        notAfter: time(na),
        spki: spki.raw,
        keyOid: oid(keyOidT.body),
        curveOid: paramT?.tag === 0x06 ? oid(paramT.body) : undefined,
    };
}

const CURVES: Record<string, {name: string; size: number}> = {
    '1.2.840.10045.3.1.7': {name: 'P-256', size: 32},
    '1.3.132.0.34': {name: 'P-384', size: 48},
    '1.3.132.0.35': {name: 'P-521', size: 66},
};
const EC_KEY = '1.2.840.10045.2.1';
const RSA_KEY = '1.2.840.113549.1.1.1';
/** Certificate signature algorithms: ECDSA and RSA PKCS #1 with SHA-2. */
const CERT_SIGNATURES: Record<string, {ec: boolean; hash: string}> = {
    '1.2.840.10045.4.3.2': {ec: true, hash: 'SHA-256'},
    '1.2.840.10045.4.3.3': {ec: true, hash: 'SHA-384'},
    '1.2.840.10045.4.3.4': {ec: true, hash: 'SHA-512'},
    '1.2.840.113549.1.1.11': {ec: false, hash: 'SHA-256'},
    '1.2.840.113549.1.1.12': {ec: false, hash: 'SHA-384'},
    '1.2.840.113549.1.1.13': {ec: false, hash: 'SHA-512'},
};

/** An ECDSA signature from DER (SEQUENCE of r and s) to Web Crypto's r‖s, each `size` bytes. */
function derToRaw(der: Uint8Array, size: number): Uint8Array {
    const seq = readTlv(der);
    if (seq.tag !== 0x30 || seq.end !== der.length) throw new Error('ECDSA: not a DER signature');
    const ints = children(seq.body);
    if (ints.length !== 2 || ints.some((i) => i.tag !== 0x02)) throw new Error('ECDSA: not a DER signature');
    const out = new Uint8Array(size * 2);
    ints.forEach((int, k) => {
        let b = int.body;
        while (b.length > size && b[0] === 0) b = b.subarray(1);
        if (b.length > size) throw new Error('ECDSA: integer too long');
        out.set(b, k * size + size - b.length);
    });
    return out;
}

function subtleCrypto(): SubtleCrypto {
    const subtle = (globalThis as {crypto?: Crypto}).crypto?.subtle;
    if (!subtle) throw new Error('Web Crypto (crypto.subtle) is not available here');
    return subtle;
}

const bytesEqual = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Whether `cert` was signed by the key in `issuer`. */
async function signedBy(cert: X509, issuer: X509): Promise<boolean> {
    const alg = CERT_SIGNATURES[cert.signatureOid];
    if (!alg) throw new Error(`certificate signature algorithm ${cert.signatureOid} is not supported`);
    const subtle = subtleCrypto();
    if (alg.ec) {
        const curve = issuer.keyOid === EC_KEY && issuer.curveOid ? CURVES[issuer.curveOid] : undefined;
        if (!curve) throw new Error('the issuing certificate has no supported EC key');
        const key = await subtle.importKey('spki', issuer.spki as BufferSource, {name: 'ECDSA', namedCurve: curve.name}, false, ['verify']);
        return subtle.verify({name: 'ECDSA', hash: alg.hash}, key, derToRaw(cert.signature, curve.size) as BufferSource, cert.tbs as BufferSource);
    }
    if (issuer.keyOid !== RSA_KEY) throw new Error('the issuing certificate has no RSA key');
    const key = await subtle.importKey('spki', issuer.spki as BufferSource, {name: 'RSASSA-PKCS1-v1_5', hash: alg.hash}, false, ['verify']);
    return subtle.verify('RSASSA-PKCS1-v1_5', key, cert.signature as BufferSource, cert.tbs as BufferSource);
}

/** A certificate as DER, from DER bytes, base64 or PEM. */
export function certificateDer(cert: Uint8Array | string): Uint8Array {
    if (typeof cert !== 'string') return cert;
    return base64Bytes(cert.replace(/-----(BEGIN|END) CERTIFICATE-----/g, ''));
}

// ── verifying ──────────────────────────────────────────────────────────────────

/** How a signature check came out. Only `valid` means the file is what its producer signed. */
export type S100SignatureOutcome =
    | 'valid'
    | 'invalid'
    | 'untrusted'
    | 'expired'
    | 'certificate-not-found'
    | 'unsupported'
    | 'error';

export interface S100SignatureResult {
    outcome: S100SignatureOutcome;
    detail?: string;
}

export interface S100VerifyOptions {
    /** The certificates the exchange set carries (the catalogue's or the signature file's). */
    certificates: readonly S100CertificateEntry[];
    schemeAdministratorId?: string;
    /**
     * The Scheme Administrator certificates to trust (DER, base64 or PEM): the IHO's for real
     * data. With none, nothing can be trusted, and the result is `untrusted` at best.
     */
    trustedRoots: readonly (Uint8Array | string)[];
    /** The catalogue's `digitalSignatureReference`; absent means Part 15's ECDSA-384-SHA2. */
    algorithm?: string;
    /** When to check the certificates' dates against (default now). */
    now?: Date;
}

/**
 * Verify one signature over a file's bytes: the signature itself, then the certificate that made
 * it, issued by a trusted Scheme Administrator certificate, both within their dates. Never throws:
 * what went wrong is in the result.
 */
export async function verifyS100Signature(data: Uint8Array, signature: S100Signature, options: S100VerifyOptions): Promise<S100SignatureResult> {
    try {
        const algorithm = (options.algorithm ?? 'ECDSA-384-SHA2').trim().toUpperCase();
        if (signature.kind === 'signature') return {outcome: 'unsupported', detail: 'a signature on another signature is not verified'};
        if (signature.kind === 'data' && signature.dataStatus !== 'unencrypted') {
            return {outcome: 'unsupported', detail: `a signature over ${signature.dataStatus ?? 'protected'} content needs the file decrypted or decompressed first`};
        }
        if (algorithm !== 'ECDSA-384-SHA2' && algorithm !== 'ECDSA') return {outcome: 'unsupported', detail: `${algorithm} signatures are not verified`};
        const part15 = algorithm === 'ECDSA-384-SHA2';
        const now = (options.now ?? new Date()).getTime();
        const roots = options.trustedRoots.map((r) => parseCertificate(certificateDer(r)));
        const pool = options.certificates.map((c) => ({entry: c, cert: parseCertificate(c.der)}));

        // The certificate that made the signature: one the set carries, or the Scheme Administrator's
        // own, which may be any of the trusted roots.
        const carried = pool.find((p) => p.entry.id === signature.certificateRef)?.cert;
        const candidates = carried ? [carried] : signature.certificateRef && signature.certificateRef === options.schemeAdministratorId ? roots : [];
        if (!candidates.length) return {outcome: 'certificate-not-found', detail: `no certificate '${signature.certificateRef}'`};

        // The signature: ECDSA over the file's exact bytes.
        let signer: X509 | undefined;
        let failure: S100SignatureResult | undefined;
        for (const candidate of candidates) {
            const why = await signatureFailure(data, signature, candidate, part15);
            if (!why) {
                signer = candidate;
                break;
            }
            if (!failure) failure = why;
        }
        if (!signer) return failure!;

        // The chain, as Part 15 builds it: the Scheme Administrator issues each data server's
        // certificate. So the signer is a trusted root, or was signed by one; no intermediate is
        // accepted, since a data server's certificate may not issue others.
        const inDates = (c: X509) => now >= c.notBefore && now <= c.notAfter;
        if (roots.includes(signer)) return inDates(signer) ? {outcome: 'valid'} : {outcome: 'expired', detail: 'the Scheme Administrator certificate is out of its dates'};
        if (!inDates(signer)) return {outcome: 'expired', detail: `the certificate is valid ${new Date(signer.notBefore).toISOString()} to ${new Date(signer.notAfter).toISOString()}`};
        for (const root of roots) {
            if (!bytesEqual(root.subject, signer.issuer) || !(await signedBy(signer, root))) continue;
            return inDates(root) ? {outcome: 'valid'} : {outcome: 'expired', detail: 'the Scheme Administrator certificate is out of its dates'};
        }
        return {outcome: 'untrusted', detail: 'the certificate was not issued by a trusted Scheme Administrator'};
    } catch (err) {
        return {outcome: 'error', detail: (err as Error).message};
    }
}

/** Why `signature` is not `cert`'s over `data`, or `undefined` when it is. */
async function signatureFailure(data: Uint8Array, signature: S100Signature, cert: X509, part15: boolean): Promise<S100SignatureResult | undefined> {
    const curve = cert.keyOid === EC_KEY && cert.curveOid ? CURVES[cert.curveOid] : undefined;
    if (!curve) return {outcome: 'unsupported', detail: 'the signing certificate has no supported EC key'};
    if (part15 && curve.name !== 'P-384') return {outcome: 'invalid', detail: 'Part 15 signatures are made with a P-384 key'};
    const subtle = subtleCrypto();
    const key = await subtle.importKey('spki', cert.spki as BufferSource, {name: 'ECDSA', namedCurve: curve.name}, false, ['verify']);
    // Part 15 encodes the signature in DER; the earlier ECDSA catalogues give r‖s.
    const raw = part15 || signature.kind !== 'legacy' ? derToRaw(signature.value, curve.size) : signature.value;
    if (raw.length !== curve.size * 2) return {outcome: 'invalid', detail: 'the signature is the wrong length for its key'};
    const ok = await subtle.verify({name: 'ECDSA', hash: part15 ? 'SHA-384' : 'SHA-256'}, key, raw as BufferSource, data as BufferSource);
    return ok ? undefined : {outcome: 'invalid', detail: 'the signature does not match the file'};
}

/**
 * Whether a catalogue path stays inside the exchange set: relative, with no `..` or `.` step, no
 * empty step and no drive letter or other `:`. Anything else is never handed to `readFile`.
 */
function insideExchangeSet(path: string): boolean {
    return path !== '' && path.split('/').every((step) => step !== '' && step !== '.' && step !== '..' && !step.includes(':'));
}

/** What an exchange set's check found: the catalogue's signature, and each dataset's. */
export interface S100ExchangeSetVerification {
    catalogue: S100SignatureResult;
    datasets: {path: string; product?: string; result: S100SignatureResult}[];
    /** True when the catalogue and every dataset checked are `valid`. */
    allValid: boolean;
}

/**
 * Check an exchange set: `CATALOG.XML` against `CATALOG.SIGN`, then each dataset the catalogue
 * lists (all, or those of `products`) against its signatures, reading files through `readFile`
 * (a path in the set; undefined for a file that is not there). A cancelled dataset is skipped.
 */
export async function verifyS100ExchangeSet(options: {
    readFile: (path: string) => Promise<Uint8Array | undefined>;
    trustedRoots: readonly (Uint8Array | string)[];
    products?: readonly string[];
    now?: Date;
}): Promise<S100ExchangeSetVerification> {
    const {readFile, trustedRoots, now} = options;
    const catalogueBytes = await readFile('CATALOG.XML');
    if (!catalogueBytes) throw new Error('The exchange set has no CATALOG.XML');
    const catalogue = readS100ExchangeCatalogue(new TextDecoder().decode(catalogueBytes));

    let catalogueResult: S100SignatureResult;
    const signBytes = await readFile('CATALOG.SIGN');
    if (!signBytes) catalogueResult = {outcome: 'untrusted', detail: 'the exchange set has no CATALOG.SIGN'};
    else {
        try {
            const sign = readS100StandaloneSignature(new TextDecoder().decode(signBytes));
            catalogueResult = await verifyS100Signature(catalogueBytes, sign.signature, {certificates: sign.certificates, schemeAdministratorId: sign.schemeAdministratorId, trustedRoots, now});
        } catch (err) {
            catalogueResult = {outcome: 'error', detail: `CATALOG.SIGN: ${(err as Error).message}`};
        }
    }

    const datasets: S100ExchangeSetVerification['datasets'] = [];
    for (const d of catalogue.datasets) {
        if (d.cancelled || (options.products && !options.products.includes(d.product ?? ''))) continue;
        if (!insideExchangeSet(d.path)) {
            datasets.push({path: d.path, product: d.product, result: {outcome: 'error', detail: 'the path leaves the exchange set'}});
            continue;
        }
        const data = await readFile(d.path);
        let result: S100SignatureResult;
        if (!data) result = {outcome: 'error', detail: 'the file is missing'};
        else if (!d.signatures.length) result = {outcome: 'untrusted', detail: 'the dataset is not signed'};
        else {
            // Valid if any signature on the plain file is valid; else the most telling failure.
            const results: S100SignatureResult[] = [];
            for (const s of d.signatures) results.push(await verifyS100Signature(data, s, {certificates: catalogue.certificates, schemeAdministratorId: catalogue.schemeAdministratorId, trustedRoots, algorithm: d.signatureAlgorithm, now}));
            result = results.find((r) => r.outcome === 'valid') ?? results.find((r) => r.outcome !== 'unsupported') ?? results[0];
        }
        datasets.push({path: d.path, product: d.product, result});
    }
    return {catalogue: catalogueResult, datasets, allValid: catalogueResult.outcome === 'valid' && datasets.every((d) => d.result.outcome === 'valid')};
}
