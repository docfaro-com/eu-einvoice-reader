import { describeCertificate, type CertificateInfo } from '../p7m/cms.ts';
import { elementChildren, localName } from '../xml.ts';

/*
 * Reads XML signatures (XMLDSig with the XAdES qualifying properties) the way .xsig files carry them: enveloped in a
 * Facturae or other XML document, enveloping a base64 document in ds:Object, or next to an AFIRMA/CONTENT element as
 * AutoFirma writes "XAdES Detached". It reports what the signature *claims*: signer certificate, signing time, policy,
 * role. Nothing here checks the signature value, the certificate chain or revocation.
 */

const DS = 'http://www.w3.org/2000/09/xmldsig#';

const ALGORITHMS: Record<string, string> = {
  'http://www.w3.org/2000/09/xmldsig#rsa-sha1': 'RSA-SHA1',
  'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256': 'RSA-SHA256',
  'http://www.w3.org/2001/04/xmldsig-more#rsa-sha384': 'RSA-SHA384',
  'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512': 'RSA-SHA512',
  'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256': 'ECDSA-SHA256',
  'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha384': 'ECDSA-SHA384',
  'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha512': 'ECDSA-SHA512',
  'http://www.w3.org/2000/09/xmldsig#sha1': 'SHA-1',
  'http://www.w3.org/2001/04/xmlenc#sha256': 'SHA-256',
  'http://www.w3.org/2001/04/xmldsig-more#sha384': 'SHA-384',
  'http://www.w3.org/2001/04/xmlenc#sha512': 'SHA-512',
};
const algo = (uri: string) => ALGORITHMS[uri] ?? uri.replace(/^.*[#/]/, '');

export type Placement = 'enveloped' | 'enveloping' | 'detached';

export interface XadesSignature {
  id: string;
  /** The certificate the signature names as the signer's (xades:SigningCertificate), or the first one in KeyInfo. */
  certificate: CertificateInfo | null;
  certificateCount: number;
  signingTime: Date | null;
  signatureAlgorithm: string;
  digestAlgorithm: string;
  isXades: boolean;
  xadesVersion: string;
  /** XAdES-BES, -EPES (with a signature policy), -T (time-stamped), -C, -X, -XL, -A; plain XMLDSig otherwise. */
  form: string;
  policy: { identifier: string; description: string; facturae: string } | null;
  roles: string[];
  hasTimestamp: boolean;
  placement: Placement;
  /** References to the signed data, without the ones to SignedProperties and KeyInfo. */
  dataReferences: string[];
}

export type XsigContent =
  | { kind: 'facturae' }
  | { kind: 'xml'; root: string; namespace: string }
  | { kind: 'embedded'; bytes: Uint8Array; mimeType: string; fileName: string; description: string }
  | { kind: 'embedded-xml'; xml: string; root: string }
  | { kind: 'detached'; uri: string };

export interface XsigReport {
  signatures: XadesSignature[];
  content: XsigContent;
}

export class NoSignatureError extends Error {}

function descendants(el: Element | Document, name: string, ns?: string): Element[] {
  const list = ns ? el.getElementsByTagNameNS(ns, name) : el.getElementsByTagName('*');
  const out: Element[] = [];
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (ns || localName(e) === name) out.push(e);
  }
  return out;
}

const firstDesc = (el: Element | null, name: string) => (el ? (descendants(el, name)[0] ?? null) : null);
const textOf = (el: Element | null) => (el?.textContent ?? '').trim();

export function base64Bytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function form(sig: Element, hasPolicy: boolean): string {
  const has = (n: string) => descendants(sig, n).length > 0;
  if (!has('QualifyingProperties')) return 'XMLDSig';
  if (has('ArchiveTimeStamp')) return 'XAdES-A';
  if (has('CertificateValues') || has('RevocationValues')) return 'XAdES-XL';
  if (has('SigAndRefsTimeStamp') || has('RefsOnlyTimeStamp')) return 'XAdES-X';
  if (has('CompleteCertificateRefs')) return 'XAdES-C';
  if (has('SignatureTimeStamp')) return 'XAdES-T';
  return hasPolicy ? 'XAdES-EPES' : 'XAdES-BES';
}

async function digest(alg: string, data: Uint8Array): Promise<string> {
  const name = { 'SHA-1': 'SHA-1', 'SHA-256': 'SHA-256', 'SHA-384': 'SHA-384', 'SHA-512': 'SHA-512' }[alg];
  // Web Crypto only exists in secure contexts (https, localhost); without it the signer falls back to the first certificate.
  if (!name || !globalThis.crypto?.subtle) return '';
  const buf = await crypto.subtle.digest(name, data as BufferSource);
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s);
}

/** Picks the signer's certificate by the digest xades:SigningCertificate states; without a match, the first certificate. */
async function signerCertificate(sig: Element, certs: Uint8Array[]): Promise<Uint8Array | null> {
  const cert = firstDesc(firstDesc(sig, 'SigningCertificateV2') ?? firstDesc(sig, 'SigningCertificate'), 'Cert');
  const method = firstDesc(cert, 'DigestMethod')?.getAttribute('Algorithm') ?? '';
  const value = textOf(firstDesc(cert, 'DigestValue'));
  if (value) {
    for (const c of certs) if ((await digest(algo(method), c)) === value) return c;
  }
  return certs[0] ?? null;
}

function placement(sig: Element, refs: string[]): Placement {
  const parent = sig.parentNode as Element | null;
  const isRoot = !parent || parent.nodeType !== 1;
  const objectIds = new Set(elementChildren(sig).filter((e) => localName(e) === 'Object').map((o) => o.getAttribute('Id')).filter(Boolean));
  if (refs.some((r) => r.startsWith('#') && objectIds.has(r.slice(1)))) return 'enveloping';
  const transforms = descendants(sig, 'Transform').map((t) => t.getAttribute('Algorithm') ?? '');
  if (!isRoot && (refs.includes('') || transforms.some((t) => t.endsWith('#enveloped-signature')))) return 'enveloped';
  return 'detached';
}

async function readSignature(sig: Element): Promise<XadesSignature> {
  const signedInfo = elementChildren(sig).find((e) => localName(e) === 'SignedInfo') ?? null;
  const refs = signedInfo ? elementChildren(signedInfo).filter((e) => localName(e) === 'Reference') : [];
  const keyInfo = elementChildren(sig).find((e) => localName(e) === 'KeyInfo') ?? null;
  const keyIds = new Set([keyInfo?.getAttribute('Id'), ...descendants(keyInfo ?? sig, 'X509Data').map((x) => x.getAttribute('Id'))].filter(Boolean));
  const dataRefs = refs.filter((r) => {
    const type = r.getAttribute('Type') ?? '';
    const uri = r.getAttribute('URI') ?? '';
    return !type.endsWith('SignedProperties') && !(uri.startsWith('#') && keyIds.has(uri.slice(1)));
  });
  const certs = descendants(keyInfo ?? sig, 'X509Certificate').map((c) => {
    try {
      return base64Bytes(textOf(c));
    } catch {
      return new Uint8Array();
    }
  });
  const der = await signerCertificate(sig, certs.filter((c) => c.length));
  const policyId = firstDesc(firstDesc(sig, 'SigPolicyId'), 'Identifier');
  const identifier = textOf(policyId);
  const time = textOf(firstDesc(sig, 'SigningTime'));
  const parsedTime = time ? new Date(time) : null;
  const qp = firstDesc(sig, 'QualifyingProperties');
  const facturaePolicy = /politica_de_firma_formato_facturae_v(\d+)_(\d+)/i.exec(identifier);
  return {
    id: sig.getAttribute('Id') ?? '',
    certificate: der ? describeCertificate(der) : null,
    certificateCount: certs.length,
    signingTime: parsedTime && !Number.isNaN(parsedTime.getTime()) ? parsedTime : null,
    signatureAlgorithm: algo(firstDesc(signedInfo, 'SignatureMethod')?.getAttribute('Algorithm') ?? ''),
    digestAlgorithm: algo(firstDesc(dataRefs[0] ?? signedInfo, 'DigestMethod')?.getAttribute('Algorithm') ?? ''),
    isXades: Boolean(qp),
    xadesVersion: /01903\/v(\d+(?:\.\d+)*)#/.exec(qp?.namespaceURI ?? '')?.[1] ?? '',
    form: form(sig, Boolean(identifier)),
    policy: identifier
      ? { identifier, description: textOf(firstDesc(firstDesc(sig, 'SigPolicyId'), 'Description')), facturae: facturaePolicy ? `${facturaePolicy[1]}.${facturaePolicy[2]}` : '' }
      : null,
    roles: descendants(sig, 'ClaimedRole').map(textOf).filter(Boolean),
    hasTimestamp: descendants(sig, 'SignatureTimeStamp').length > 0,
    placement: placement(sig, dataRefs.map((r) => r.getAttribute('URI') ?? '')),
    dataReferences: dataRefs.map((r) => r.getAttribute('URI') ?? ''),
  };
}

function byId(doc: Document, id: string): Element | null {
  const list = doc.getElementsByTagName('*');
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.getAttribute('Id') === id || e.getAttribute('ID') === id || e.getAttribute('id') === id) return e;
  }
  return null;
}

const isBase64 = (s: string) => s.length >= 4 && /^[A-Za-z0-9+/=\s]+$/.test(s);

function embedded(el: Element, fallbackMime = ''): XsigContent | null {
  const child = elementChildren(el)[0];
  if (child) {
    if (localName(child) === 'QualifyingProperties') return null;
    // xmldom (unit tests) has no global XMLSerializer, but its nodes serialise themselves.
    const xml = typeof XMLSerializer === 'undefined' ? String(child) : new XMLSerializer().serializeToString(child);
    return { kind: 'embedded-xml', xml, root: localName(child) };
  }
  const raw = textOf(el);
  if (!raw) return null;
  const encoding = el.getAttribute('Encoding') ?? '';
  const bytes = /base64/i.test(encoding) || isBase64(raw) ? base64Bytes(raw) : new TextEncoder().encode(raw);
  return {
    kind: 'embedded',
    bytes,
    mimeType: el.getAttribute('MimeType') ?? fallbackMime,
    fileName: el.getAttribute('fileName') ?? el.getAttribute('FileName') ?? '',
    description: el.getAttribute('Description') ?? '',
  };
}

/** The signed document: the Facturae itself, another enveloping XML, or what is embedded next to or inside the signature. */
function content(doc: Document, sigs: Element[], reports: XadesSignature[]): XsigContent {
  const root = doc.documentElement;
  const name = localName(root);
  if (name === 'Facturae') return { kind: 'facturae' };
  const first = reports[0];
  if (name !== 'Signature' && first?.placement === 'enveloped') return { kind: 'xml', root: name, namespace: root.namespaceURI ?? '' };
  for (const uri of first?.dataReferences ?? []) {
    if (!uri.startsWith('#')) continue;
    const target = byId(doc, uri.slice(1));
    if (!target) continue;
    // DataObjectFormat/MimeType describes the referenced object when the element itself does not.
    const mime = descendants(sigs[0], 'DataObjectFormat').map((d) => textOf(firstDesc(d, 'MimeType'))).find(Boolean) ?? '';
    const found = embedded(target, mime);
    if (found) return found;
  }
  const external = first?.dataReferences.find((u) => u && !u.startsWith('#'));
  return { kind: 'detached', uri: external ?? first?.dataReferences[0] ?? '' };
}

/** All signatures in the document (counter-signatures and co-signatures included), outermost first. */
export async function readXsig(doc: Document): Promise<XsigReport> {
  const sigs = descendants(doc, 'Signature', DS).filter((s) => elementChildren(s).some((c) => localName(c) === 'SignedInfo'));
  if (!sigs.length) throw new NoSignatureError('no-signature');
  const signatures = await Promise.all(sigs.map(readSignature));
  return { signatures, content: content(doc, sigs, signatures) };
}
