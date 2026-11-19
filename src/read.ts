import { runChecks, type CheckResult } from './einvoice/checks.ts';
import type { Lang } from './einvoice/codes.ts';
import { describeProfile, detectXmlKind, parseEInvoice, sbdhPayload, type ProfileInfo } from './einvoice/detect.ts';
import type { Invoice } from './einvoice/model.ts';
import type { RuleLang } from './einvoice/rule-texts.ts';
import { runRules, type RulesReport } from './einvoice/rules.ts';
import { checkFacturae } from './facturae/checks.ts';
import { readFacturae, type Facturae } from './facturae/parse.ts';
import { parseFatturaPA, type FatturaPA } from './fatturapa/parse.ts';
import { runKsefChecks } from './ksef/checks.ts';
import { parseKsef, type KsefInvoice } from './ksef/parse.ts';
import { decodeXmlBytes, parseXml, rootName, rootNamespace, type XmlParser } from './xml.ts';

export type Format = 'ubl' | 'cii' | 'fatturapa' | 'fatturapa-simplified' | 'facturae' | 'ksef' | 'unknown';

export interface ReadOptions {
  /** A DOMParser instance. Defaults to `globalThis.DOMParser`, which exists in browsers but not in Node.js. */
  parser?: XmlParser;
}

export type ReadResult =
  | { format: 'ubl' | 'cii'; invoice: Invoice; profile: ProfileInfo }
  | { format: 'fatturapa'; invoice: FatturaPA }
  | { format: 'facturae'; invoice: Facturae }
  | { format: 'ksef'; invoice: KsefInvoice };

export class UnknownFormatError extends Error {
  format: Format;
  root: string;
  constructor(format: Format, root: string) {
    super(`unsupported-format:${format}:${root}`);
    this.format = format;
    this.root = root;
  }
}

export function resolveParser(parser?: XmlParser): XmlParser {
  if (parser) return parser;
  const Ctor = (globalThis as { DOMParser?: new () => XmlParser }).DOMParser;
  if (!Ctor) {
    throw new Error('No DOMParser available. In Node.js pass one in, e.g. { parser: new DOMParser() } from @xmldom/xmldom.');
  }
  return new Ctor();
}

/** Bytes are decoded by BOM and XML declaration, because Italian and Spanish files are often ISO-8859-1. */
export function toXmlText(xml: string | Uint8Array | ArrayBuffer): string {
  if (typeof xml === 'string') return xml;
  return decodeXmlBytes(xml instanceof Uint8Array ? xml : new Uint8Array(xml));
}

export function detectDocumentFormat(doc: Document): Format {
  if (sbdhPayload(doc)) return 'ubl';
  const kind = detectXmlKind(doc);
  if (kind !== 'unknown') return kind;
  const name = rootName(doc);
  if (name === 'Facturae') return 'facturae';
  if (name === 'Faktura' && rootNamespace(doc).includes('crd.gov.pl')) return 'ksef';
  return 'unknown';
}

/** Recognises the format from the root element and namespace, without reading the rest of the file. */
export function detectFormat(xml: string | Uint8Array | ArrayBuffer, options: ReadOptions = {}): Format {
  return detectDocumentFormat(parseXml(toXmlText(xml), resolveParser(options.parser)));
}

/**
 * Parses any supported invoice XML into the model of its format: the syntax-neutral EN 16931 model for UBL and CII
 * (XRechnung, ZUGFeRD, Factur-X, Peppol BIS), and format-specific models for FatturaPA, Facturae and KSeF.
 */
export function readInvoice(xml: string | Uint8Array | ArrayBuffer, options: ReadOptions = {}): ReadResult {
  const text = toXmlText(xml);
  const parser = resolveParser(options.parser);
  const doc = parseXml(text, parser);
  const format = detectDocumentFormat(doc);
  switch (format) {
    case 'ubl':
    case 'cii': {
      const invoice = parseEInvoice(text, parser);
      return { format, invoice, profile: describeProfile(invoice.customizationId) };
    }
    case 'fatturapa':
      return { format, invoice: parseFatturaPA(text, parser) };
    case 'facturae':
      return { format, invoice: readFacturae(doc) };
    case 'ksef':
      return { format, invoice: parseKsef(text, parser) };
    default:
      throw new UnknownFormatError(format, rootName(doc));
  }
}

/**
 * Plausibility checks for a parsed invoice: totals arithmetic, VAT per rate, mandatory fields, IBAN and tax ID
 * check digits. Message languages: UBL/CII de, en, it, nl, fr; Facturae es, en; KSeF pl, en. Others fall back to
 * English. FatturaPA has no checks yet and returns an empty list.
 */
export function checkInvoice(result: ReadResult, lang = 'en'): CheckResult[] {
  switch (result.format) {
    case 'ubl':
    case 'cii':
      return runChecks(result.invoice, (['de', 'en', 'it', 'nl', 'fr', 'fr-FR'].includes(lang) ? lang : 'en') as Lang);
    case 'facturae':
      return checkFacturae(result.invoice, lang === 'es' ? 'es' : 'en');
    case 'ksef':
      return runKsefChecks(result.invoice, lang === 'pl' ? 'pl' : 'en');
    default:
      return [];
  }
}

export interface ValidateOptions extends ReadOptions {
  /** Language of the rule explanations and fix hints. */
  lang?: RuleLang;
}

/**
 * EN 16931 and XRechnung business rules for a UBL or CII invoice, each with a plain-language explanation and a fix
 * hint. A pre-check, not a replacement for the official validator: no XSD and no Schematron engine run, and only the
 * rules listed by `coveredRules()` are evaluated.
 */
export function validateEn16931(xml: string | Uint8Array | ArrayBuffer, options: ValidateOptions = {}): RulesReport & { invoice: Invoice } {
  const text = toXmlText(xml);
  const parser = resolveParser(options.parser);
  const doc = parseXml(text, parser);
  // The rules read some details straight from the document element, so a Peppol SBDH envelope is not accepted here.
  const format = detectXmlKind(doc);
  if (format !== 'ubl' && format !== 'cii') throw new UnknownFormatError(detectDocumentFormat(doc), rootName(doc));
  const invoice = parseEInvoice(text, parser);
  return { ...runRules(invoice, doc, options.lang ?? 'en'), invoice };
}
