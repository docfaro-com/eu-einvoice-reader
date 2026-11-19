import { elementChildren, localName, parseXml, rootName, rootNamespace, type XmlParser } from '../xml.ts';
import { parseCii } from './cii.ts';
import type { Invoice } from './model.ts';
import { parseUbl } from './ubl.ts';

export type XmlKind = 'ubl' | 'cii' | 'fatturapa' | 'fatturapa-simplified' | 'unknown';

export function detectXmlKind(doc: Document): XmlKind {
  const name = rootName(doc);
  const ns = rootNamespace(doc);
  if ((name === 'Invoice' || name === 'CreditNote') && ns.includes('oasis')) return 'ubl';
  if (name === 'CrossIndustryInvoice' || name === 'CrossIndustryDocument') return 'cii';
  if (name === 'FatturaElettronica') return 'fatturapa';
  if (name === 'FatturaElettronicaSemplificata') return 'fatturapa-simplified';
  return 'unknown';
}

export class UnsupportedFormatError extends Error {
  kind: XmlKind;
  constructor(kind: XmlKind) {
    super(`unsupported:${kind}`);
    this.kind = kind;
  }
}

/**
 * Files saved from a Peppol access point sometimes keep the transport
 * envelope (StandardBusinessDocument) around the invoice; the invoice is the
 * element that follows the StandardBusinessDocumentHeader.
 */
export function sbdhPayload(doc: Document): Element | null {
  if (rootName(doc) !== 'StandardBusinessDocument') return null;
  return elementChildren(doc.documentElement).find((e) => /^(Invoice|CreditNote)$/.test(localName(e)) && (e.namespaceURI ?? '').includes('oasis')) ?? null;
}

export function parseEInvoice(xmlText: string, parser: XmlParser): Invoice {
  const doc = parseXml(xmlText, parser);
  const wrapped = sbdhPayload(doc);
  if (wrapped) return parseUbl(doc, wrapped);
  const kind = detectXmlKind(doc);
  if (kind === 'ubl') return parseUbl(doc);
  if (kind === 'cii') return parseCii(doc);
  throw new UnsupportedFormatError(kind);
}

export type Standard = 'xrechnung' | 'zugferd' | 'facturx' | 'peppol' | 'en16931' | 'unknown';

export interface ProfileInfo {
  standard: Standard;
  profile: string;
  version: string;
  /** MINIMUM, BASIC WL and ZUGFeRD 1.0 do not carry a full EN 16931 data set. */
  meetsEn16931: boolean;
}

/** Interpret BT-24 (specification identifier) into something a human recognises. */
export function describeProfile(customizationId: string): ProfileInfo {
  const id = customizationId.trim();
  const lower = id.toLowerCase();
  const xr = /xrechnung_(\d+(?:\.\d+)*)/i.exec(id);
  if (xr) {
    const ext = lower.includes('#conformant#urn:xeinkauf.de:kosit:extension:xrechnung');
    return { standard: 'xrechnung', profile: ext ? 'XRechnung Extension' : 'XRechnung', version: xr[1], meetsEn16931: true };
  }
  if (lower.includes('peppol')) return { standard: 'peppol', profile: 'Peppol BIS Billing 3.0', version: '3.0', meetsEn16931: true };
  if (lower.includes('factur-x.eu:1p0:minimum')) return { standard: 'facturx', profile: 'MINIMUM', version: '', meetsEn16931: false };
  if (lower.includes('factur-x.eu:1p0:basicwl')) return { standard: 'facturx', profile: 'BASIC WL', version: '', meetsEn16931: false };
  if (lower.includes('factur-x.eu:1p0:basic')) return { standard: 'facturx', profile: 'BASIC', version: '', meetsEn16931: true };
  if (lower.includes('factur-x.eu:1p0:extended')) return { standard: 'facturx', profile: 'EXTENDED', version: '', meetsEn16931: true };
  if (lower.startsWith('urn:ferd:') || lower.includes('zugferd')) {
    const v1 = /urn:ferd:(?:crossindustrydocument:)?invoice:1p0:(\w+)/i.exec(id);
    if (v1) return { standard: 'zugferd', profile: v1[1].toUpperCase(), version: '1.0', meetsEn16931: false };
    return { standard: 'zugferd', profile: id, version: '', meetsEn16931: true };
  }
  if (lower === 'urn:cen.eu:en16931:2017') return { standard: 'en16931', profile: 'EN 16931 (COMFORT)', version: '', meetsEn16931: true };
  if (lower.startsWith('urn:cen.eu:en16931:2017')) return { standard: 'en16931', profile: 'EN 16931', version: '', meetsEn16931: true };
  return { standard: 'unknown', profile: id, version: '', meetsEn16931: true };
}
