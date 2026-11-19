import * as asn1js from 'asn1js';
import { Certificate, ContentInfo, SignedData, type SignerInfo } from 'pkijs';

/*
 * Unwraps CAdES / CMS SignedData envelopes (.p7m) and reports what the
 * envelope *claims* about its signers. Nothing here verifies signatures,
 * certificate chains or revocation: that needs the EU trusted lists and is
 * deliberately out of scope for this library.
 */

const OID = {
  signedData: '1.2.840.113549.1.7.2',
  data: '1.2.840.113549.1.7.1',
  signingTime: '1.2.840.113549.1.9.5',
  signingCertV2: '1.2.840.113549.1.9.16.2.47',
  signingCertV1: '1.2.840.113549.1.9.16.2.12',
  timestampToken: '1.2.840.113549.1.9.16.2.14',
  qcStatements: '1.3.6.1.5.5.7.1.3',
  qcCompliance: '0.4.0.1862.1.1',
  qcSscd: '0.4.0.1862.1.4',
  keyUsage: '2.5.29.15',
};

const DIGESTS: Record<string, string> = {
  '1.3.14.3.2.26': 'SHA-1',
  '2.16.840.1.101.3.4.2.1': 'SHA-256',
  '2.16.840.1.101.3.4.2.2': 'SHA-384',
  '2.16.840.1.101.3.4.2.3': 'SHA-512',
};

const NAME_ATTRS: Record<string, string> = {
  '2.5.4.3': 'CN',
  '2.5.4.4': 'SN',
  '2.5.4.42': 'GN',
  '2.5.4.5': 'serialNumber',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.12': 'title',
  '2.5.4.46': 'dnQualifier',
  '2.5.4.97': 'organizationIdentifier',
  '1.2.840.113549.1.9.1': 'email',
};

export interface DistinguishedName {
  [key: string]: string;
}

export interface SignerReport {
  subject: DistinguishedName;
  issuer: DistinguishedName;
  serialHex: string;
  notBefore: Date | null;
  notAfter: Date | null;
  signingTime: Date | null;
  digestAlgorithm: string;
  isCades: boolean;
  hasTimestamp: boolean;
  declaresQualified: boolean;
  declaresQscd: boolean;
  nonRepudiation: boolean;
  certificateFound: boolean;
}

export interface UnwrapResult {
  content: Uint8Array;
  /** One entry per envelope, outermost first; nested .p7m.p7m files have several. */
  layers: SignerReport[][];
  contentKind: ContentKind;
}

export type ContentKind = 'pdf' | 'xml' | 'zip' | 'png' | 'jpeg' | 'tiff' | 'p7m' | 'text' | 'unknown';

export class P7mError extends Error {
  code: 'not-cms' | 'not-signed' | 'detached' | 'empty';
  constructor(code: 'not-cms' | 'not-signed' | 'detached' | 'empty') {
    super(code);
    this.code = code;
  }
}

function startsWith(b: Uint8Array, sig: number[], offset = 0): boolean {
  return sig.every((v, i) => b[offset + i] === v);
}

export function sniff(bytes: Uint8Array): ContentKind {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return 'pdf';
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return 'zip';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) return 'tiff';
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 512)).replace(/^﻿|^ï»¿/, '').trimStart();
  if (head.startsWith('<')) return 'xml';
  if (bytes[0] === 0x30 && looksLikeSignedData(bytes)) return 'p7m';
  // Some PDFs carry a few junk bytes before the header; the PDF spec tolerates 1024.
  if (head.includes('%PDF-')) return 'pdf';
  if (/^[\x09\x0a\x0d\x20-\x7e -ÿ]*$/.test(head)) return 'text';
  return 'unknown';
}

function looksLikeSignedData(bytes: Uint8Array): boolean {
  try {
    const asn = asn1js.fromBER(bytes);
    if (asn.offset === -1) return false;
    const ci = new ContentInfo({ schema: asn.result });
    return ci.contentType === OID.signedData;
  } catch {
    return false;
  }
}

/** Some tools ship .p7m as base64 text (with or without PEM armour). */
export function normaliseInput(bytes: Uint8Array): Uint8Array {
  if (bytes[0] === 0x30) return bytes;
  const text = new TextDecoder('latin1').decode(bytes);
  const body = text
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/=]+$/.test(body) || body.length < 16) return bytes;
  try {
    const bin = atob(body);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out[0] === 0x30 ? out : bytes;
  } catch {
    return bytes;
  }
}

/** BER allows the content OCTET STRING to be split into (nested) chunks; CAdES tools often do this for large files. */
function flattenOctets(node: asn1js.BaseBlock): Uint8Array[] {
  const block = node as asn1js.OctetString;
  if (block.idBlock.isConstructed) {
    const parts = (block.valueBlock as unknown as { value: asn1js.BaseBlock[] }).value ?? [];
    return parts.flatMap(flattenOctets);
  }
  return [new Uint8Array(block.valueBlock.valueHexView)];
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function dn(rdn: { typesAndValues: { type: string; value: { valueBlock: { value: unknown } } }[] }): DistinguishedName {
  const out: DistinguishedName = {};
  for (const tv of rdn.typesAndValues) {
    const key = NAME_ATTRS[tv.type] ?? tv.type;
    const v = String(tv.value.valueBlock.value ?? '');
    out[key] = out[key] ? `${out[key]}, ${v}` : v;
  }
  return out;
}

function hex(buf: ArrayBuffer | Uint8Array): string {
  return Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function equalBytes(a: ArrayBuffer | Uint8Array, b: ArrayBuffer | Uint8Array): boolean {
  const x = a instanceof Uint8Array ? a : new Uint8Array(a);
  const y = b instanceof Uint8Array ? b : new Uint8Array(b);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

function findCertificate(si: SignerInfo, certs: Certificate[]): Certificate | null {
  const sid = si.sid as asn1js.BaseBlock;
  // A context-specific [0] tag means the signer is identified by subjectKeyIdentifier instead of issuer + serial.
  if (sid.idBlock?.tagClass === 3) {
    const ski = new Uint8Array((sid as asn1js.Primitive).valueBlock.valueHexView);
    return (
      certs.find((c) => {
        const ext = c.extensions?.find((e) => e.extnID === '2.5.29.14');
        const parsed = ext?.parsedValue as asn1js.OctetString | undefined;
        return parsed ? equalBytes(parsed.valueBlock.valueHexView, ski) : false;
      }) ?? null
    );
  }
  const ias = si.sid as unknown as { issuer: Certificate['issuer']; serialNumber: asn1js.Integer };
  return (
    certs.find(
      (c) =>
        equalBytes(c.serialNumber.valueBlock.valueHexView, ias.serialNumber.valueBlock.valueHexView) &&
        c.issuer.isEqual(ias.issuer),
    ) ?? null
  );
}

function attrTime(si: SignerInfo): Date | null {
  const a = si.signedAttrs?.attributes.find((x) => x.type === OID.signingTime);
  const v = a?.values[0] as (asn1js.UTCTime | asn1js.GeneralizedTime) | undefined;
  return v && typeof (v as asn1js.UTCTime).toDate === 'function' ? (v as asn1js.UTCTime).toDate() : null;
}

function qcFlags(cert: Certificate | null): { qualified: boolean; qscd: boolean; nonRepudiation: boolean } {
  const res = { qualified: false, qscd: false, nonRepudiation: false };
  if (!cert?.extensions) return res;
  for (const ext of cert.extensions) {
    if (ext.extnID === OID.qcStatements) {
      const raw = new Uint8Array(ext.extnValue.valueBlock.valueHexView);
      const asn = asn1js.fromBER(raw);
      const seq = asn.result as asn1js.Sequence;
      for (const st of seq.valueBlock?.value ?? []) {
        const id = ((st as asn1js.Sequence).valueBlock.value[0] as asn1js.ObjectIdentifier)?.valueBlock?.toString();
        if (id === OID.qcCompliance) res.qualified = true;
        if (id === OID.qcSscd) res.qscd = true;
      }
    }
    if (ext.extnID === OID.keyUsage) {
      const bits = new Uint8Array((ext.parsedValue as asn1js.BitString)?.valueBlock?.valueHexView ?? new Uint8Array());
      // keyUsage bit 1 = nonRepudiation / contentCommitment
      res.nonRepudiation = bits.length > 0 && (bits[0] & 0x40) !== 0;
    }
  }
  return res;
}

function report(si: SignerInfo, certs: Certificate[]): SignerReport {
  const cert = findCertificate(si, certs);
  const qc = qcFlags(cert);
  const attrs = si.signedAttrs?.attributes ?? [];
  return {
    subject: cert ? dn(cert.subject as never) : {},
    issuer: cert ? dn(cert.issuer as never) : {},
    serialHex: cert ? hex(cert.serialNumber.valueBlock.valueHexView) : '',
    notBefore: cert ? cert.notBefore.value : null,
    notAfter: cert ? cert.notAfter.value : null,
    signingTime: attrTime(si),
    digestAlgorithm: DIGESTS[si.digestAlgorithm.algorithmId] ?? si.digestAlgorithm.algorithmId,
    isCades: attrs.some((a) => a.type === OID.signingCertV2 || a.type === OID.signingCertV1),
    hasTimestamp: (si.unsignedAttrs?.attributes ?? []).some((a) => a.type === OID.timestampToken),
    declaresQualified: qc.qualified,
    declaresQscd: qc.qscd,
    nonRepudiation: qc.nonRepudiation,
    certificateFound: Boolean(cert),
  };
}

function unwrapOnce(bytes: Uint8Array): { content: Uint8Array; signers: SignerReport[] } {
  const asn = asn1js.fromBER(bytes);
  if (asn.offset === -1) throw new P7mError('not-cms');
  let ci: ContentInfo;
  try {
    ci = new ContentInfo({ schema: asn.result });
  } catch {
    throw new P7mError('not-cms');
  }
  if (ci.contentType !== OID.signedData) throw new P7mError('not-signed');
  const sd = new SignedData({ schema: ci.content });
  const eContent = sd.encapContentInfo.eContent;
  if (!eContent) throw new P7mError('detached');
  const content = concat(flattenOctets(eContent));
  if (content.length === 0) throw new P7mError('empty');
  const certs = (sd.certificates ?? []).filter((c): c is Certificate => c instanceof Certificate);
  return { content, signers: sd.signerInfos.map((si) => report(si, certs)) };
}

/** Unwraps up to a few nested envelopes, which Italian tools produce when a document is counter-signed. */
export function unwrapP7m(input: Uint8Array, maxDepth = 5): UnwrapResult {
  let bytes = normaliseInput(input);
  const layers: SignerReport[][] = [];
  for (let depth = 0; depth < maxDepth; depth++) {
    const { content, signers } = unwrapOnce(bytes);
    layers.push(signers);
    bytes = content;
    const inner = normaliseInput(bytes);
    if (inner[0] !== 0x30 || !looksLikeSignedData(inner)) break;
    bytes = inner;
  }
  return { content: bytes, layers, contentKind: sniff(bytes) };
}

/** "fattura.xml.p7m" → "fattura.xml"; adds an extension when the original name had none. */
export function innerFileName(outerName: string, kind: ContentKind): string {
  let name = outerName.replace(/(\.p7m)+$/i, '').replace(/\.p7s$/i, '');
  if (!name) name = 'documento';
  const ext: Partial<Record<ContentKind, string>> = { pdf: '.pdf', xml: '.xml', zip: '.zip', png: '.png', jpeg: '.jpg', tiff: '.tif', text: '.txt' };
  if (!/\.[A-Za-z0-9]{2,5}$/.test(name) && ext[kind]) name += ext[kind];
  return name;
}

export interface CertificateInfo {
  subject: DistinguishedName;
  issuer: DistinguishedName;
  serialHex: string;
  notBefore: Date | null;
  notAfter: Date | null;
  declaresQualified: boolean;
  declaresQscd: boolean;
  nonRepudiation: boolean;
}

/** What a DER certificate claims about itself; used for the certificates inside XAdES signatures (.xsig). */
export function describeCertificate(der: Uint8Array): CertificateInfo | null {
  try {
    const asn = asn1js.fromBER(der);
    if (asn.offset === -1) return null;
    const cert = new Certificate({ schema: asn.result });
    const qc = qcFlags(cert);
    return {
      subject: dn(cert.subject as never),
      issuer: dn(cert.issuer as never),
      serialHex: hex(cert.serialNumber.valueBlock.valueHexView),
      notBefore: cert.notBefore.value,
      notAfter: cert.notAfter.value,
      declaresQualified: qc.qualified,
      declaresQscd: qc.qscd,
      nonRepudiation: qc.nonRepudiation,
    };
  } catch {
    return null;
  }
}
