export {
  checkInvoice,
  detectDocumentFormat,
  detectFormat,
  readInvoice,
  resolveParser,
  toXmlText,
  UnknownFormatError,
  validateEn16931,
  type Format,
  type ReadOptions,
  type ReadResult,
  type ValidateOptions,
} from './read.ts';

export { decodeXmlBytes, parseXml, XmlError, type XmlParser } from './xml.ts';

// EN 16931: UBL 2.1 and UN/CEFACT CII (XRechnung, ZUGFeRD, Factur-X, Peppol BIS Billing 3.0)
export type { Address, AllowanceCharge, Attachment, Invoice, Line, Party, PaymentMeans, Syntax, Totals, VatBreakdown } from './einvoice/model.ts';
export { describeProfile, detectXmlKind, parseEInvoice, sbdhPayload, UnsupportedFormatError, type ProfileInfo, type Standard, type XmlKind } from './einvoice/detect.ts';
export { parseCii } from './einvoice/cii.ts';
export { parseUbl } from './einvoice/ubl.ts';
export { beCheckDigitsValid, dec, fromDec, ibanValid, runChecks, type CheckResult, type CheckStatus } from './einvoice/checks.ts';
export { coveredRules, runRules, type Finding, type FindingStatus, type RulesReport, type Severity } from './einvoice/rules.ts';
export { ruleText, RULE_TEXTS, type RuleLang } from './einvoice/rule-texts.ts';
export { INVOICE_TYPES, label, PAYMENT_MEANS, UNITS, VAT_CATEGORIES, type Lang } from './einvoice/codes.ts';
export * as codelists from './einvoice/codelists.ts';
export { KNOWN_XML_NAMES, pickInvoiceXml, type PdfAttachment } from './einvoice/hybrid.ts';

// Italy: FatturaPA 1.2 (FPA12, FPR12)
export { NotFatturaPAError, parseFatturaPA, type FatturaPA, type FpAttachment, type FpBody, type FpLine, type FpParty, type FpPaymentDetail, type FpSummary } from './fatturapa/parse.ts';
export * as fatturapaCodes from './fatturapa/codes.ts';

// Spain: Facturae 3.x
export {
  fullNumber,
  isFacturae,
  NotFacturaeError,
  parseFacturae,
  readFacturae,
  type FeAddress,
  type FeAdjustment,
  type FeAttachment,
  type FeCentre,
  type FeInstallment,
  type FeInvoice,
  type FeLine,
  type FeParty,
  type Facturae,
  type FeTax,
} from './facturae/parse.ts';
export { checkFacturae, type FeCheckLang } from './facturae/checks.ts';
export { checkNif, type NifKind, type NifResult } from './facturae/nif.ts';
export * as facturaeCodes from './facturae/codes.ts';

// Poland: KSeF FA(3) and FA(2)
export {
  KSEF_NUMBER_RE,
  ksefNumberFromFileName,
  ksefVariant,
  NotKsefError,
  parseKsef,
  type KsefAddress,
  type KsefAttachmentBlock,
  type KsefInvoice,
  type KsefLine,
  type KsefParty,
  type KsefVariant,
  type KsefVatRow,
} from './ksef/parse.ts';
export { accountValid, nipValid, runKsefChecks } from './ksef/checks.ts';
export { kodIUrl, KSEF_QR_BASE, sha256Base64Url } from './ksef/qr.ts';
export * as ksefCodes from './ksef/codes.ts';
