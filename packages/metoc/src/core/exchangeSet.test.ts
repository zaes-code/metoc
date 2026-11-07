import {beforeAll, describe, expect, it} from 'vitest';
import {readS100ExchangeCatalogue, readS100StandaloneSignature, verifyS100ExchangeSet, verifyS100Signature, type S100Signature} from './exchangeSet';
import {readS100Dataset} from './s100';

/** A day as S-100 writes it (yyyy-mm-dd), built so the source carries no literal date. */
const day = (y: number, m: number, d: number) => [y, String(m).padStart(2, '0'), String(d).padStart(2, '0')].join('-');
const ISSUE = day(2026, 11, 6);

// ── a little DER, to make real certificates and signatures for the tests ───────

const bytes = (...parts: (number[] | Uint8Array)[]) => Uint8Array.from(parts.flatMap((p) => [...p]));
function tlv(tag: number, body: Uint8Array): Uint8Array {
    const n = body.length;
    const len = n < 128 ? [n] : n < 256 ? [0x81, n] : [0x82, n >> 8, n & 255];
    return bytes([tag], len, body);
}
const seq = (...items: Uint8Array[]) => tlv(0x30, bytes(...items));
const int = (n: number) => tlv(0x02, Uint8Array.of(n));
function oid(s: string): Uint8Array {
    const [a, b, ...rest] = s.split('.').map(Number);
    const out = [a * 40 + b];
    for (const v of rest) {
        const groups = [];
        let x = v;
        do {
            groups.unshift(x & 0x7f);
            x = Math.floor(x / 128);
        } while (x);
        out.push(...groups.map((g, i) => (i < groups.length - 1 ? g | 0x80 : g)));
    }
    return tlv(0x06, Uint8Array.from(out));
}
const utc = (d: Date) => tlv(0x17, new TextEncoder().encode(d.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z'));
const name = (cn: string) => seq(tlv(0x31, seq(oid('2.5.4.3'), tlv(0x0c, new TextEncoder().encode(cn)))));

/** An r‖s ECDSA signature as DER. */
function rawToDer(raw: Uint8Array): Uint8Array {
    const half = raw.length / 2;
    const part = (b: Uint8Array) => {
        let i = 0;
        while (i < b.length - 1 && b[i] === 0) i++;
        const t = b.subarray(i);
        return tlv(0x02, t[0] & 0x80 ? bytes([0], t) : t);
    };
    return seq(part(raw.subarray(0, half)), part(raw.subarray(half)));
}

const subtle = globalThis.crypto.subtle;
const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const P384 = {name: 'ECDSA', namedCurve: 'P-384'} as const;

async function certificate(subject: string, issuer: string, subjectKey: CryptoKeyPair, issuerKey: CryptoKey, from = new Date(day(2026, 1, 1)), to = new Date(day(2036, 1, 1))): Promise<Uint8Array> {
    const spki = new Uint8Array(await subtle.exportKey('spki', subjectKey.publicKey));
    const alg = seq(oid('1.2.840.10045.4.3.3'));
    const tbs = seq(tlv(0xa0, int(2)), int(7), alg, name(issuer), seq(utc(from), utc(to)), name(subject), spki);
    const sig = new Uint8Array(await subtle.sign({name: 'ECDSA', hash: 'SHA-384'}, issuerKey, tbs as BufferSource));
    return seq(tbs, alg, tlv(0x03, bytes([0], rawToDer(sig))));
}

async function signDer(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
    return rawToDer(new Uint8Array(await subtle.sign({name: 'ECDSA', hash: 'SHA-384'}, key, data as BufferSource)));
}

let sa: CryptoKeyPair;
let server: CryptoKeyPair;
let rogue: CryptoKeyPair;
let saCert: Uint8Array;
let serverCert: Uint8Array;
let rogueCert: Uint8Array;
let expiredCert: Uint8Array;

beforeAll(async () => {
    [sa, server, rogue] = await Promise.all([0, 1, 2].map(() => subtle.generateKey(P384, true, ['sign', 'verify']) as Promise<CryptoKeyPair>));
    saCert = await certificate('Test Scheme Administrator', 'Test Scheme Administrator', sa, sa.privateKey);
    serverCert = await certificate('Test Data Server', 'Test Scheme Administrator', server, sa.privateKey);
    // A certificate naming the Scheme Administrator as issuer, but signed by another key.
    rogueCert = await certificate('Rogue Data Server', 'Test Scheme Administrator', rogue, rogue.privateKey);
    expiredCert = await certificate('Old Data Server', 'Test Scheme Administrator', server, sa.privateKey, new Date(day(2020, 1, 1)), new Date(day(2021, 1, 1)));
});

const DATASET = new TextEncoder().encode(`<S412:Dataset xmlns:S412="x" xmlns:S100="y" xmlns:gml="z"><S100:DatasetIdentificationInformation><S100:productIdentifier>S-412</S100:productIdentifier></S100:DatasetIdentificationInformation><S412:members><S412:ThunderstormWarning gml:id="T"><S412:geometry><S100:surfaceProperty><S100:Surface gml:id="s"><gml:patches><gml:PolygonPatch><gml:exterior><gml:LinearRing><gml:posList>60 -32 60.2 -32 60.2 -32.3 60 -32</gml:posList></gml:LinearRing></gml:exterior></gml:PolygonPatch></gml:patches></S100:Surface></S100:surfaceProperty></S412:geometry></S412:ThunderstormWarning></S412:members></S412:Dataset>`);

const catalogueXml = (signature: Uint8Array, cert = serverCert) => `<?xml version="1.0" encoding="utf-8"?>
<S100XC:S100_ExchangeCatalogue xmlns:gco="g" xmlns:gex="e" xmlns:S100SE="http://www.iho.int/s100/se/5.2" xmlns:S100XC="http://www.iho.int/s100/xc/5.2">
  <S100XC:certificates>
    <S100SE:schemeAdministrator id="TEST-SA" />
    <S100SE:certificate id="TEST-DS" issuer="TEST-SA">${b64(cert)}</S100SE:certificate>
  </S100XC:certificates>
  <S100XC:datasetDiscoveryMetadata>
    <S100XC:S100_DatasetDiscoveryMetadata>
      <S100XC:fileName>412XX00TEST.GML</S100XC:fileName>
      <S100XC:filePath>\\S-412\\DATASET_FILES</S100XC:filePath>
      <S100XC:compressionFlag>false</S100XC:compressionFlag>
      <S100XC:dataProtection>false</S100XC:dataProtection>
      <S100XC:digitalSignatureReference>ECDSA-384-SHA2</S100XC:digitalSignatureReference>
      <S100XC:digitalSignatureValue>
        <S100SE:S100_SE_SignatureOnData id="sig-1" certificateRef="TEST-DS" dataStatus="unencrypted">${b64(signature)}</S100SE:S100_SE_SignatureOnData>
      </S100XC:digitalSignatureValue>
      <S100XC:purpose>newDataset</S100XC:purpose>
      <S100XC:editionNumber>2</S100XC:editionNumber>
      <S100XC:issueDate>${ISSUE}</S100XC:issueDate>
      <S100XC:boundingBox>
        <gex:westBoundLongitude><gco:Decimal>-33</gco:Decimal></gex:westBoundLongitude>
        <gex:eastBoundLongitude><gco:Decimal>-31</gco:Decimal></gex:eastBoundLongitude>
        <gex:southBoundLatitude><gco:Decimal>59</gco:Decimal></gex:southBoundLatitude>
        <gex:northBoundLatitude><gco:Decimal>61</gco:Decimal></gex:northBoundLatitude>
      </S100XC:boundingBox>
      <S100XC:productSpecification><S100XC:name><gco:CharacterString>Marine Weather Warnings</gco:CharacterString></S100XC:name><S100XC:version><gco:CharacterString>1.1.0</gco:CharacterString></S100XC:version><S100XC:productIdentifier>S-412</S100XC:productIdentifier></S100XC:productSpecification>
    </S100XC:S100_DatasetDiscoveryMetadata>
    <S100XC:S100_DatasetDiscoveryMetadata>
      <S100XC:fileName>412XX00OLD.GML</S100XC:fileName>
      <S100XC:purpose>cancellation</S100XC:purpose>
    </S100XC:S100_DatasetDiscoveryMetadata>
  </S100XC:datasetDiscoveryMetadata>
</S100XC:S100_ExchangeCatalogue>`;

const signFile = (fileName: string, signature: Uint8Array, cert = serverCert) => `<?xml version="1.0"?>
<S100SE:StandaloneDigitalSignature xmlns:S100SE="http://www.iho.int/s100/se/5.2">
  <S100SE:filename>${fileName}</S100SE:filename>
  <S100SE:certificates>
    <S100SE:schemeAdministrator id="TEST-SA" />
    <S100SE:certificate id="TEST-DS" issuer="TEST-SA">${b64(cert)}</S100SE:certificate>
  </S100SE:certificates>
  <S100SE:digitalSignature id="catalogue" certificateRef="TEST-DS">${b64(signature)}</S100SE:digitalSignature>
</S100SE:StandaloneDigitalSignature>`;

const NOW = new Date(ISSUE);

describe('readS100ExchangeCatalogue', () => {
    it('reads an edition 5 catalogue: datasets, paths, signatures and certificates', async () => {
        const c = readS100ExchangeCatalogue(catalogueXml(await signDer(server.privateKey, DATASET)));
        expect(c.schemeAdministratorId).toBe('TEST-SA');
        expect(c.certificates.map((x) => [x.id, x.issuer, x.der.length > 100])).toEqual([['TEST-DS', 'TEST-SA', true]]);
        expect(c.datasets).toHaveLength(2);
        const [d, old] = c.datasets;
        expect({...d, signatures: undefined}).toEqual({
            fileName: '412XX00TEST.GML',
            path: 'S-412/DATASET_FILES/412XX00TEST.GML',
            product: 'S-412',
            productVersion: '1.1.0',
            edition: 2,
            update: undefined,
            issueDate: ISSUE,
            bbox: [-33, 59, -31, 61],
            cancelled: false,
            protected: false,
            compressed: false,
            signatureAlgorithm: 'ECDSA-384-SHA2',
            signatures: undefined,
        });
        expect(d.signatures.map((s) => [s.kind, s.id, s.certificateRef, s.dataStatus])).toEqual([['data', 'sig-1', 'TEST-DS', 'unencrypted']]);
        expect(old.cancelled).toBe(true);
    });

    it('reads the earlier layout, records under the root', () => {
        const c = readS100ExchangeCatalogue(`<ec:S100_ExchangeCatalogue xmlns:ec="http://www.iho.int/S100EC"><ec:S100_DatasetDiscoveryMetadata><ec:fileName>file:/S-411/411DE00TEST.gml</ec:fileName></ec:S100_DatasetDiscoveryMetadata></ec:S100_ExchangeCatalogue>`);
        expect(c.datasets.map((d) => d.path)).toEqual(['S-411/411DE00TEST.gml']);
    });

    it('reads a standalone signature', async () => {
        const s = readS100StandaloneSignature(signFile('CATALOG.XML', await signDer(server.privateKey, DATASET)));
        expect([s.fileName, s.schemeAdministratorId, s.signature.certificateRef, s.certificates.length]).toEqual(['CATALOG.XML', 'TEST-SA', 'TEST-DS', 1]);
        expect(() => readS100StandaloneSignature('<Other/>')).toThrow();
    });
});

describe('verifyS100Signature', () => {
    const verify = async (data: Uint8Array, sig: Partial<S100Signature> & {value: Uint8Array}, cert = serverCert, roots: (Uint8Array | string)[] = [saCert], algorithm?: string) =>
        verifyS100Signature(data, {kind: 'data', id: 's', certificateRef: 'TEST-DS', dataStatus: 'unencrypted', ...sig}, {certificates: [{id: 'TEST-DS', issuer: 'TEST-SA', der: cert}], schemeAdministratorId: 'TEST-SA', trustedRoots: roots, algorithm, now: NOW});

    it('accepts a signature over the exact bytes by a certificate the Scheme Administrator issued', async () => {
        expect(await verify(DATASET, {value: await signDer(server.privateKey, DATASET)})).toEqual({outcome: 'valid'});
        // The root given as PEM.
        const pem = `-----BEGIN CERTIFICATE-----\n${b64(saCert)}\n-----END CERTIFICATE-----`;
        expect((await verify(DATASET, {value: await signDer(server.privateKey, DATASET)}, serverCert, [pem])).outcome).toBe('valid');
    });

    it('refuses a changed file, an untrusted or forged issuer, an expired certificate, and no roots', async () => {
        const sig = await signDer(server.privateKey, DATASET);
        const changed = DATASET.slice();
        changed[changed.length - 20] ^= 1;
        expect((await verify(changed, {value: sig})).outcome).toBe('invalid');
        const other = await subtle.generateKey(P384, true, ['sign', 'verify']) as CryptoKeyPair;
        const otherRoot = await certificate('Another Administrator', 'Another Administrator', other, other.privateKey);
        expect((await verify(DATASET, {value: sig}, serverCert, [otherRoot])).outcome).toBe('untrusted');
        expect((await verify(DATASET, {value: await signDer(rogue.privateKey, DATASET)}, rogueCert)).outcome).toBe('untrusted');
        expect((await verify(DATASET, {value: sig}, expiredCert)).outcome).toBe('expired');
        expect((await verify(DATASET, {value: sig}, serverCert, [])).outcome).toBe('untrusted');
    });

    it('reports what it does not verify as unsupported, and a bad certificate reference', async () => {
        const sig = await signDer(server.privateKey, DATASET);
        expect((await verify(DATASET, {value: sig, kind: 'signature', signatureRef: 'x'})).outcome).toBe('unsupported');
        expect((await verify(DATASET, {value: sig, dataStatus: 'encrypted'})).outcome).toBe('unsupported');
        expect((await verify(DATASET, {value: sig}, serverCert, [saCert], 'DSA')).outcome).toBe('unsupported');
        expect((await verify(DATASET, {value: sig, certificateRef: 'NOPE'})).outcome).toBe('certificate-not-found');
        expect((await verify(DATASET, {value: Uint8Array.of(1, 2, 3)})).outcome).toBe('error');
    });
});

describe('verifyS100ExchangeSet', () => {
    it('checks the catalogue and each dataset, skips a cancellation, and the data reads', async () => {
        const catalogue = new TextEncoder().encode(catalogueXml(await signDer(server.privateKey, DATASET)));
        const files: Record<string, Uint8Array> = {
            'CATALOG.XML': catalogue,
            'CATALOG.SIGN': new TextEncoder().encode(signFile('CATALOG.XML', await signDer(server.privateKey, catalogue))),
            'S-412/DATASET_FILES/412XX00TEST.GML': DATASET,
        };
        const readFile = async (p: string) => files[p];
        const result = await verifyS100ExchangeSet({readFile, trustedRoots: [saCert], now: NOW});
        expect(result).toEqual({catalogue: {outcome: 'valid'}, datasets: [{path: 'S-412/DATASET_FILES/412XX00TEST.GML', product: 'S-412', result: {outcome: 'valid'}}], allValid: true});
        expect(readS100Dataset(new TextDecoder().decode(DATASET)).features).toHaveLength(1);

        // A catalogue changed after signing fails, and the set is not all valid.
        const tampered: Record<string, Uint8Array> = {...files, 'CATALOG.XML': new TextEncoder().encode(new TextDecoder().decode(catalogue).replace(ISSUE, day(2026, 11, 7)))};
        const bad = await verifyS100ExchangeSet({readFile: async (p) => tampered[p], trustedRoots: [saCert], now: NOW});
        expect(bad.catalogue.outcome).toBe('invalid');
        expect(bad.allValid).toBe(false);

        // No CATALOG.SIGN: never valid.
        const unsigned = await verifyS100ExchangeSet({readFile: async (p) => (p === 'CATALOG.SIGN' ? undefined : files[p]), trustedRoots: [saCert], now: NOW});
        expect(unsigned.catalogue.outcome).toBe('untrusted');
    });
});
