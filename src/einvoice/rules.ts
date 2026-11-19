import { all, attr, first, text } from '../xml.ts';
import { dec, fromDec, ibanValid, runChecks, type CheckResult } from './checks.ts';
import { COUNTRY_CODES, CREDIT_NOTE_TYPE_CODES, CURRENCY_CODES, EAS_CODES, INVOICE_TYPE_CODES, PAYMENT_MEANS_CODES, UNIT_CODES, VAT_CATEGORY_CODES } from './codelists.ts';
import { describeProfile } from './detect.ts';
import type { AllowanceCharge, Invoice, Line } from './model.ts';
import { RULE_TEXTS, ruleText, type RuleLang } from './rule-texts.ts';

/*
 * A JavaScript re-implementation of the EN 16931 and XRechnung business rules
 * that matter most in practice. The plausibility checks (checks.ts)
 * are reused as they are; this module adds the remaining rules and attaches a
 * plain-language explanation and a fix hint to every result. It is a pre-check,
 * not the official KoSIT validator: no Schematron engine, and only the rules
 * listed in RULE_TEXTS are evaluated.
 */

export type Severity = 'error' | 'warning';
export type FindingStatus = 'pass' | 'fail' | 'warn';

export interface Finding {
  rule: string;
  status: FindingStatus;
  severity: Severity;
  /** Plain-language statement of the rule. */
  message: string;
  /** What to change in the invoice. */
  fix: string;
  /** Concrete values or positions from this file, if any. */
  detail: string;
  bt: string;
}

const SCALE = 1_000_000n;
const TOLERANCE = 10_000n;
const close = (a: bigint, b: bigint) => (a > b ? a - b : b - a) <= TOLERANCE;
const sum = (xs: (bigint | null)[]) => xs.reduce<bigint>((a, b) => a + (b ?? 0n), 0n);

/** Details that the shared Invoice model does not carry, read straight from the XML. */
interface Extras {
  invoicePeriodPresent: boolean;
  linePeriodPresent: boolean[];
  taxPointDateCode: string;
  creditorId: string;
  paymentTermsRaw: string;
  vatAccountingTotal: string | null;
  payeePresent: boolean;
  taxRepPresent: boolean;
  taxRepCountry: string;
  taxRepAddressPresent: boolean;
  standardIdWithoutScheme: string[];
  classificationWithoutScheme: string[];
  deliveryAddressPresent: boolean;
  currencyIds: string[];
}

function extras(doc: Document, inv: Invoice): Extras {
  const root = doc.documentElement;
  if (inv.syntax === 'UBL') {
    const lines = all(root, 'InvoiceLine|CreditNoteLine');
    const taxTotals = all(root, 'TaxTotal');
    const acc = taxTotals.find((t) => inv.taxCurrency && attr(t, 'TaxAmount', 'currencyID') === inv.taxCurrency && inv.taxCurrency !== inv.currency);
    const rep = first(root, 'TaxRepresentativeParty');
    const supplier = first(root, 'AccountingSupplierParty/Party');
    const payee = first(root, 'PayeeParty');
    const sepa = [...all(supplier, 'PartyIdentification/ID'), ...all(payee, 'PartyIdentification/ID')].find((e) => (e.getAttribute('schemeID') ?? '').toUpperCase() === 'SEPA');
    return {
      invoicePeriodPresent: Boolean(first(root, 'InvoicePeriod')),
      linePeriodPresent: lines.map((l) => Boolean(first(l, 'InvoicePeriod'))),
      taxPointDateCode: text(root, 'InvoicePeriod/DescriptionCode'),
      creditorId: sepa ? text(sepa) : '',
      paymentTermsRaw: first(root, 'PaymentTerms/Note')?.textContent ?? '',
      vatAccountingTotal: inv.taxCurrency && inv.taxCurrency !== inv.currency ? (acc ? text(acc, 'TaxAmount') : '') : null,
      payeePresent: Boolean(payee),
      taxRepPresent: Boolean(rep),
      taxRepCountry: text(rep, 'PostalAddress/Country/IdentificationCode'),
      taxRepAddressPresent: Boolean(first(rep, 'PostalAddress')),
      standardIdWithoutScheme: lines.filter((l) => {
        const id = first(l, 'Item/StandardItemIdentification/ID');
        return id && !id.getAttribute('schemeID');
      }).map((l) => text(l, 'ID')),
      classificationWithoutScheme: lines.filter((l) => all(l, 'Item/CommodityClassification/ItemClassificationCode').some((c) => !c.getAttribute('listID'))).map((l) => text(l, 'ID')),
      deliveryAddressPresent: Boolean(first(root, 'Delivery/DeliveryLocation/Address')),
      currencyIds: [...doc.getElementsByTagName('*')].map((e) => e.getAttribute('currencyID') ?? '').filter(Boolean),
    };
  }
  const tx = first(root, 'SupplyChainTradeTransaction');
  const set = first(tx, 'ApplicableHeaderTradeSettlement');
  const agr = first(tx, 'ApplicableHeaderTradeAgreement');
  const lines = all(tx, 'IncludedSupplyChainTradeLineItem');
  const rep = first(agr, 'SellerTaxRepresentativeTradeParty');
  const sumEl = first(set, 'SpecifiedTradeSettlementHeaderMonetarySummation');
  const acc = all(sumEl, 'TaxTotalAmount').find((t) => inv.taxCurrency && t.getAttribute('currencyID') === inv.taxCurrency);
  return {
    invoicePeriodPresent: Boolean(first(set, 'BillingSpecifiedPeriod')),
    linePeriodPresent: lines.map((l) => Boolean(first(l, 'SpecifiedLineTradeSettlement/BillingSpecifiedPeriod'))),
    taxPointDateCode: text(set, 'ApplicableTradeTax/DueDateTypeCode'),
    creditorId: text(set, 'CreditorReferenceID'),
    paymentTermsRaw: first(set, 'SpecifiedTradePaymentTerms/Description')?.textContent ?? '',
    vatAccountingTotal: inv.taxCurrency && inv.taxCurrency !== inv.currency ? (acc ? text(acc) : '') : null,
    payeePresent: Boolean(first(set, 'PayeeTradeParty')),
    taxRepPresent: Boolean(rep),
    taxRepCountry: text(rep, 'PostalTradeAddress/CountryID'),
    taxRepAddressPresent: Boolean(first(rep, 'PostalTradeAddress')),
    standardIdWithoutScheme: lines.filter((l) => {
      const id = first(l, 'SpecifiedTradeProduct/GlobalID');
      return id && !id.getAttribute('schemeID');
    }).map((l) => text(l, 'AssociatedDocumentLineDocument/LineID')),
    classificationWithoutScheme: lines
      .filter((l) => all(l, 'SpecifiedTradeProduct/DesignatedProductClassification/ClassCode').some((c) => !c.getAttribute('listID')))
      .map((l) => text(l, 'AssociatedDocumentLineDocument/LineID')),
    deliveryAddressPresent: Boolean(first(tx, 'ApplicableHeaderTradeDelivery/ShipToTradeParty/PostalTradeAddress')),
    currencyIds: [...doc.getElementsByTagName('*')].map((e) => e.getAttribute('currencyID') ?? '').filter(Boolean),
  };
}

class Collector {
  readonly findings: Finding[] = [];
  private lang: RuleLang;
  constructor(lang: RuleLang) {
    this.lang = lang;
  }

  private push(rule: string, ok: boolean, detail = ''): void {
    const t = ruleText(rule, this.lang);
    const severity = t.severity;
    this.findings.push({ rule, status: ok ? 'pass' : severity === 'warning' ? 'warn' : 'fail', severity, message: t.msg, fix: t.fix, detail: ok ? '' : detail, bt: t.bt });
  }

  check(rule: string, ok: boolean, detail = ''): void {
    this.push(rule, ok, detail);
  }

  /** One finding for a rule evaluated on many items, listing the items that break it. */
  each<T>(rule: string, items: T[], ok: (x: T) => boolean, label: (x: T) => string): void {
    if (!items.length) return;
    const bad = items.filter((x) => !ok(x));
    this.push(rule, bad.length === 0, bad.map(label).slice(0, 12).join(', ') + (bad.length > 12 ? ' …' : ''));
  }

  fromCheck(r: CheckResult): void {
    const t = ruleText(r.rule, this.lang);
    // The plausibility checks already phrase what they found; that sentence becomes the detail.
    this.findings.push({ rule: r.rule, status: r.status, severity: r.status === 'warn' ? 'warning' : t.severity, message: t.msg, fix: t.fix, detail: r.status === 'pass' ? '' : r.message, bt: t.bt });
  }
}

const has = (s: string | null | undefined) => Boolean(s && s.trim());
const addressPresent = (a: { lines: string[]; city: string; postcode: string; country: string; subdivision: string }) =>
  a.lines.length > 0 || has(a.city) || has(a.postcode) || has(a.country) || has(a.subdivision);
const decimals = (s: string) => (/\.(\d+)$/.exec(s.trim())?.[1].length ?? 0);
const flatLines = (ls: Line[]): Line[] => ls.flatMap((l) => [l, ...flatLines(l.subLines)]);

const CATEGORY_NAMES: Record<string, Record<RuleLang, string>> = {
  S: { de: 'Normalsatz (S)', en: 'standard rate (S)', fr: 'taux normal (S)' },
  Z: { de: 'Nullsatz (Z)', en: 'zero rate (Z)', fr: 'taux zéro (Z)' },
  E: { de: 'steuerbefreit (E)', en: 'exempt (E)', fr: 'exonéré (E)' },
  AE: { de: 'Steuerschuldnerschaft des Leistungsempfängers (AE)', en: 'reverse charge (AE)', fr: 'autoliquidation (AE)' },
  K: { de: 'innergemeinschaftliche Lieferung (K)', en: 'intra-community supply (K)', fr: 'livraison intracommunautaire (K)' },
  G: { de: 'Ausfuhr außerhalb der EU (G)', en: 'export outside the EU (G)', fr: 'exportation hors UE (G)' },
  O: { de: 'nicht steuerbar (O)', en: 'not subject to VAT (O)', fr: 'hors champ de la TVA (O)' },
};
/** Rule prefixes per VAT category; K uses "IC" in the standard. */
const CAT_PREFIX: Record<string, string> = { S: 'BR-S', Z: 'BR-Z', E: 'BR-E', AE: 'BR-AE', K: 'BR-IC', G: 'BR-G', O: 'BR-O' };

function vatCategoryRules(inv: Invoice, c: Collector, lang: RuleLang): void {
  const lines = inv.lines;
  const docAc = inv.allowancesCharges;
  const seller = inv.seller;
  const repVat = inv.taxRepresentative?.vatId ?? '';
  for (const cat of Object.keys(CAT_PREFIX)) {
    const p = CAT_PREFIX[cat];
    const catLines = lines.filter((l) => l.vatCategory === cat);
    const catAllow = docAc.filter((a) => !a.isCharge && a.vatCategory === cat);
    const catCharge = docAc.filter((a) => a.isCharge && a.vatCategory === cat);
    const breakdowns = inv.vat.filter((v) => v.category === cat);
    if (!catLines.length && !catAllow.length && !catCharge.length && !breakdowns.length) continue;
    const name = CATEGORY_NAMES[cat][lang];
    const used = catLines.length + catAllow.length + catCharge.length > 0;

    if (used) {
      const exactlyOne = cat !== 'S';
      c.check(`${p}-01`, exactlyOne ? breakdowns.length === 1 : breakdowns.length >= 1, `${name}: ${breakdowns.length}`);
    }
    if (catLines.length) {
      let ok: boolean;
      if (cat === 'S' || cat === 'Z' || cat === 'E') ok = has(seller.vatId) || has(seller.taxNumber) || has(repVat);
      else if (cat === 'AE') ok = (has(seller.vatId) || has(seller.taxNumber) || has(repVat)) && (has(inv.buyer.vatId) || has(inv.buyer.legalId));
      else if (cat === 'K') ok = (has(seller.vatId) || has(repVat)) && has(inv.buyer.vatId);
      else if (cat === 'G') ok = has(seller.vatId) || has(repVat);
      else ok = !has(seller.vatId) && !has(repVat) && !has(inv.buyer.vatId);
      c.check(`${p}-02`, ok);
    }
    const rateOk = (rate: string) => {
      if (cat === 'O') return !has(rate);
      const r = dec(rate);
      if (cat === 'S') return r !== null && r > 0n;
      return r === null || r === 0n;
    };
    c.each(`${p}-05`, catLines, (l) => rateOk(l.vatRate), (l) => `${{ de: 'Pos.', en: 'line', fr: 'ligne' }[lang]} ${l.id}${lang === 'fr' ? '\u00a0' : ''}: ${l.vatRate || '–'}`);
    c.each(`${p}-06`, catAllow, (a) => rateOk(a.vatRate), (a) => `${a.reason || a.reasonCode || a.amount}: ${a.vatRate || '–'}`);
    c.each(`${p}-07`, catCharge, (a) => rateOk(a.vatRate), (a) => `${a.reason || a.reasonCode || a.amount}: ${a.vatRate || '–'}`);

    // Taxable amount per breakdown: lines minus allowances plus charges of the same category (and rate, for S and Z).
    const sameRate = (rate: string, other: string) => cat !== 'S' && cat !== 'Z' ? true : dec(rate) === dec(other);
    c.each(
      `${p}-08`,
      breakdowns,
      (v) => {
        const expected =
          sum(catLines.filter((l) => sameRate(v.rate, l.vatRate)).map((l) => dec(l.amount))) -
          sum(catAllow.filter((a) => sameRate(v.rate, a.vatRate)).map((a) => dec(a.amount))) +
          sum(catCharge.filter((a) => sameRate(v.rate, a.vatRate)).map((a) => dec(a.amount)));
        const stated = dec(v.taxable);
        return stated !== null && close(stated, expected);
      },
      (v) => {
        const expected =
          sum(catLines.filter((l) => sameRate(v.rate, l.vatRate)).map((l) => dec(l.amount))) -
          sum(catAllow.filter((a) => sameRate(v.rate, a.vatRate)).map((a) => dec(a.amount))) +
          sum(catCharge.filter((a) => sameRate(v.rate, a.vatRate)).map((a) => dec(a.amount)));
        return `${v.rate ? `${v.rate} %: ` : ''}${v.taxable || '–'} ≠ ${fromDec(expected)}`;
      },
    );
    // BR-S-09 (tax = taxable × rate) is part of the shared checks; the other categories must carry zero tax.
    if (cat !== 'S') c.each(`${p}-09`, breakdowns, (v) => dec(v.tax) === 0n, (v) => v.tax || '–');
    const needsReason = cat !== 'S' && cat !== 'Z';
    c.each(
      `${p}-10`,
      breakdowns,
      (v) => (needsReason ? has(v.exemptionReason) || has(v.exemptionCode) : !has(v.exemptionReason) && !has(v.exemptionCode)),
      (v) => (needsReason ? '–' : v.exemptionReason || v.exemptionCode),
    );
  }
  if (lines.some((l) => l.vatCategory === 'K')) {
    c.check('BR-IC-11', has(inv.delivery.date) || has(inv.periodStart) || has(inv.periodEnd));
    c.check('BR-IC-12', has(inv.delivery.address?.country));
  }
  if (inv.vat.some((v) => v.category === 'O')) {
    c.check('BR-O-11', inv.vat.every((v) => v.category === 'O'));
    c.check('BR-O-12', lines.every((l) => l.vatCategory === 'O'));
  }
}

function decimalRules(inv: Invoice, c: Collector): void {
  const t = inv.totals;
  const docAllow = inv.allowancesCharges.filter((a) => !a.isCharge);
  const docCharge = inv.allowancesCharges.filter((a) => a.isCharge);
  const lines = flatLines(inv.lines);
  const lineAc = (charge: boolean) => lines.flatMap((l) => l.allowancesCharges.filter((a) => a.isCharge === charge).map((a) => ({ a, l })));
  const one = (rule: string, v: string) => has(v) && c.check(rule, decimals(v) <= 2, v);
  const many = <T,>(rule: string, items: T[], get: (x: T) => string, label: (x: T) => string) =>
    c.each(rule, items.filter((x) => has(get(x))), (x) => decimals(get(x)) <= 2, (x) => `${label(x)}: ${get(x)}`);
  many('BR-DEC-01', docAllow, (a) => a.amount, (a) => a.reason || a.reasonCode || '–');
  many('BR-DEC-02', docAllow, (a) => a.base, (a) => a.reason || a.reasonCode || '–');
  many('BR-DEC-05', docCharge, (a) => a.amount, (a) => a.reason || a.reasonCode || '–');
  many('BR-DEC-06', docCharge, (a) => a.base, (a) => a.reason || a.reasonCode || '–');
  one('BR-DEC-09', t.lineTotal);
  one('BR-DEC-10', t.allowanceTotal);
  one('BR-DEC-11', t.chargeTotal);
  one('BR-DEC-12', t.taxExclusive);
  one('BR-DEC-13', t.taxTotal);
  one('BR-DEC-14', t.taxInclusive);
  one('BR-DEC-16', t.prepaid);
  one('BR-DEC-17', t.rounding);
  one('BR-DEC-18', t.payable);
  many('BR-DEC-19', inv.vat, (v) => v.taxable, (v) => `${v.category} ${v.rate}`);
  many('BR-DEC-20', inv.vat, (v) => v.tax, (v) => `${v.category} ${v.rate}`);
  many('BR-DEC-23', lines, (l) => l.amount, (l) => `Pos. ${l.id}`);
  many('BR-DEC-24', lineAc(false), (x) => x.a.amount, (x) => `Pos. ${x.l.id}`);
  many('BR-DEC-27', lineAc(true), (x) => x.a.amount, (x) => `Pos. ${x.l.id}`);
}

function allowanceRules(inv: Invoice, c: Collector): void {
  const reasonLabel = (a: AllowanceCharge) => a.amount || '–';
  const allow = inv.allowancesCharges.filter((a) => !a.isCharge);
  const charge = inv.allowancesCharges.filter((a) => a.isCharge);
  c.each('BR-31', allow, (a) => has(a.amount), reasonLabel);
  c.each('BR-32', allow, (a) => has(a.vatCategory), reasonLabel);
  c.each('BR-33', allow, (a) => has(a.reason) || has(a.reasonCode), reasonLabel);
  c.each('BR-36', charge, (a) => has(a.amount), reasonLabel);
  c.each('BR-37', charge, (a) => has(a.vatCategory), reasonLabel);
  c.each('BR-38', charge, (a) => has(a.reason) || has(a.reasonCode), reasonLabel);
  const lineAc = flatLines(inv.lines).flatMap((l) => l.allowancesCharges.map((a) => ({ a, l })));
  const la = lineAc.filter((x) => !x.a.isCharge);
  const lc = lineAc.filter((x) => x.a.isCharge);
  c.each('BR-41', la, (x) => has(x.a.amount), (x) => `Pos. ${x.l.id}`);
  c.each('BR-42', la, (x) => has(x.a.reason) || has(x.a.reasonCode), (x) => `Pos. ${x.l.id}`);
  c.each('BR-43', lc, (x) => has(x.a.amount), (x) => `Pos. ${x.l.id}`);
  c.each('BR-44', lc, (x) => has(x.a.reason) || has(x.a.reasonCode), (x) => `Pos. ${x.l.id}`);
  // BR-CO-11 and BR-CO-12 (allowance and charge totals) are part of the shared checks in checks.ts.
}

function lineRules(inv: Invoice, x: Extras, c: Collector): void {
  const lines = inv.lines;
  const pos = (l: Line) => `Pos. ${l.id || '?'}`;
  c.each('BR-21', lines, (l) => has(l.id), pos);
  c.each('BR-22', lines, (l) => has(l.quantity), pos);
  c.each('BR-23', lines, (l) => has(l.unit), pos);
  c.each('BR-24', lines, (l) => has(l.amount), pos);
  c.each('BR-25', lines, (l) => has(l.name), pos);
  c.each('BR-26', lines, (l) => has(l.netPrice), pos);
  c.each('BR-27', lines.filter((l) => has(l.netPrice)), (l) => (dec(l.netPrice) ?? 0n) >= 0n, (l) => `${pos(l)}: ${l.netPrice}`);
  c.each('BR-28', lines.filter((l) => has(l.grossPrice)), (l) => (dec(l.grossPrice) ?? 0n) >= 0n, (l) => `${pos(l)}: ${l.grossPrice}`);
  c.each('BR-CO-04', lines, (l) => has(l.vatCategory), pos);
  c.each('BR-30', lines.filter((l) => has(l.periodStart) && has(l.periodEnd)), (l) => l.periodEnd >= l.periodStart, (l) => `${pos(l)}: ${l.periodStart} > ${l.periodEnd}`);
  c.each('BR-CO-20', lines.filter((_, i) => x.linePeriodPresent[i]), (l) => has(l.periodStart) || has(l.periodEnd), pos);
  c.each('BR-54', flatLines(lines).flatMap((l) => l.properties.map((p) => ({ l, p }))), (e) => has(e.p.name) && has(e.p.value), (e) => `Pos. ${e.l.id}`);
  if (x.standardIdWithoutScheme.length || lines.some((l) => has(l.standardItemId))) c.check('BR-64', x.standardIdWithoutScheme.length === 0, x.standardIdWithoutScheme.map((i) => `Pos. ${i}`).join(', '));
  if (x.classificationWithoutScheme.length) c.check('BR-65', false, x.classificationWithoutScheme.map((i) => `Pos. ${i}`).join(', '));
  c.each('BR-CL-23', flatLines(lines).filter((l) => has(l.unit)), (l) => UNIT_CODES.has(l.unit), (l) => `${pos(l)}: ${l.unit}`);
  c.each('BR-CL-17', [...flatLines(lines).map((l) => l.vatCategory), ...inv.allowancesCharges.map((a) => a.vatCategory)].filter(has), (v) => VAT_CATEGORY_CODES.has(v), (v) => v);
}

function documentRules(inv: Invoice, x: Extras, c: Collector): void {
  const t = inv.totals;
  c.check('BR-01', has(inv.customizationId));
  c.check('BR-08', addressPresent(inv.seller.address));
  c.check('BR-10', addressPresent(inv.buyer.address));
  c.check('BR-12', has(t.lineTotal));
  c.check('BR-13', has(t.taxExclusive));
  c.check('BR-14', has(t.taxInclusive));
  if (x.payeePresent) c.check('BR-17', has(inv.payee?.name));
  if (x.taxRepPresent) {
    c.check('BR-18', has(inv.taxRepresentative?.name));
    c.check('BR-19', x.taxRepAddressPresent);
    c.check('BR-20', has(x.taxRepCountry));
    c.check('BR-56', has(inv.taxRepresentative?.vatId));
  }
  if (x.invoicePeriodPresent) c.check('BR-CO-19', has(inv.periodStart) || has(inv.periodEnd));
  if (has(inv.periodStart) && has(inv.periodEnd)) c.check('BR-29', inv.periodEnd >= inv.periodStart, `${inv.periodStart} > ${inv.periodEnd}`);
  if (has(x.taxPointDateCode) || has(inv.taxPointDate)) c.check('BR-CO-03', !(has(x.taxPointDateCode) && has(inv.taxPointDate)));
  c.check('BR-CO-18', inv.vat.length > 0);
  c.each('BR-45', inv.vat, (v) => has(v.taxable), (v) => v.category || '?');
  c.each('BR-46', inv.vat, (v) => has(v.tax), (v) => v.category || '?');
  c.each('BR-47', inv.vat, (v) => has(v.category), (v) => v.rate || '?');
  c.each('BR-48', inv.vat.filter((v) => v.category !== 'O'), (v) => has(v.rate), (v) => v.category);
  // BR-CO-17 for every category except S, whose check (BR-S-09) the shared plausibility checks already run.
  c.each(
    'BR-CO-17',
    inv.vat.filter((v) => v.category !== 'S' && has(v.rate) && has(v.taxable) && has(v.tax)),
    (v) => close(((dec(v.taxable) ?? 0n) * (dec(v.rate) ?? 0n)) / (100n * SCALE), dec(v.tax) ?? 0n),
    (v) => `${v.category} ${v.rate} %: ${v.tax}`,
  );

  const vatIds = [inv.seller.vatId, inv.buyer.vatId, inv.taxRepresentative?.vatId ?? ''].filter(has);
  c.each('BR-CO-09', vatIds, (v) => /^[A-Z]{2}/.test(v) && (COUNTRY_CODES.has(v.slice(0, 2)) || v.startsWith('EL') || v.startsWith('XI')), (v) => v);

  c.each('BR-49', inv.paymentMeans, (pm) => has(pm.code), () => '–');
  c.each('BR-CL-16', inv.paymentMeans.filter((pm) => has(pm.code)), (pm) => PAYMENT_MEANS_CODES.has(pm.code), (pm) => pm.code);
  c.each('BR-61', inv.paymentMeans.filter((pm) => ['30', '58'].includes(pm.code)), (pm) => has(pm.iban), (pm) => pm.code);
  c.each('BR-51', inv.paymentMeans.filter((pm) => has(pm.card)), (pm) => pm.card.replace(/\D/g, '').length <= 10, () => '••••');
  c.each('BR-52', inv.attachments, (a) => has(a.id), (a) => a.filename || a.description || '–');
  c.each('BR-55', inv.precedingInvoices, (p) => has(p.number), (p) => p.date || '–');
  if (x.vatAccountingTotal !== null) c.check('BR-53', has(x.vatAccountingTotal), inv.taxCurrency);
  if (x.deliveryAddressPresent && inv.delivery.address) c.check('BR-57', has(inv.delivery.address.country));
  if (inv.seller.endpoint) c.check('BR-62', has(inv.seller.endpoint.scheme));
  if (inv.buyer.endpoint) c.check('BR-63', has(inv.buyer.endpoint.scheme));
  c.each('BR-CL-25', [inv.seller.endpoint, inv.buyer.endpoint].filter((e) => e && has(e.scheme)) as { value: string; scheme: string }[], (e) => EAS_CODES.has(e.scheme), (e) => e.scheme);

  if (has(inv.typeCode)) c.check('BR-CL-01', INVOICE_TYPE_CODES.has(inv.typeCode) || CREDIT_NOTE_TYPE_CODES.has(inv.typeCode), inv.typeCode);
  if (has(inv.currency)) c.check('BR-CL-04', CURRENCY_CODES.has(inv.currency), inv.currency);
  const badCurrencyIds = [...new Set(x.currencyIds.filter((cur) => !CURRENCY_CODES.has(cur)))];
  if (x.currencyIds.length) c.check('BR-CL-03', badCurrencyIds.length === 0, badCurrencyIds.join(', '));
  const countries = [inv.seller.address.country, inv.buyer.address.country, inv.delivery.address?.country ?? '', x.taxRepCountry].filter(has);
  c.each('BR-CL-14', countries, (cc) => COUNTRY_CODES.has(cc), (cc) => cc);
}

function xrechnungRules(inv: Invoice, x: Extras, c: Collector): void {
  const s = inv.seller;
  const b = inv.buyer;
  c.check('BR-DE-3', has(s.address.city));
  c.check('BR-DE-4', has(s.address.postcode));
  c.check('BR-DE-5', has(s.contact.name));
  c.check('BR-DE-6', has(s.contact.phone));
  c.check('BR-DE-7', has(s.contact.email));
  c.check('BR-DE-8', has(b.address.city));
  c.check('BR-DE-9', has(b.address.postcode));
  if (x.deliveryAddressPresent && inv.delivery.address) {
    c.check('BR-DE-10', has(inv.delivery.address.city));
    c.check('BR-DE-11', has(inv.delivery.address.postcode));
  }
  c.each('BR-DE-14', inv.vat, (v) => has(v.rate), (v) => v.category);
  const taxedCats = ['S', 'Z', 'E', 'AE', 'K', 'G', 'L', 'M'];
  const usesTaxed = [...inv.lines.map((l) => l.vatCategory), ...inv.allowancesCharges.map((a) => a.vatCategory)].some((cat) => taxedCats.includes(cat));
  if (usesTaxed) c.check('BR-DE-16', has(s.vatId) || has(s.taxNumber) || Boolean(inv.taxRepresentative));
  c.check('BR-DE-17', ['326', '380', '384', '389', '381', '875', '876', '877'].includes(inv.typeCode), inv.typeCode);
  // Skonto lines start with "#" and follow KoSIT's fixed pattern; the last one must end with a line break.
  const skontoLines = x.paymentTermsRaw.split(/\r?\n/).filter((l) => l.trim().startsWith('#'));
  if (skontoLines.length) {
    const re = /^#SKONTO#TAGE=[0-9]+#PROZENT=[0-9]+\.[0-9]{2}(#BASISBETRAG=-?[0-9]+\.[0-9]{2})?#$/;
    const bad = skontoLines.filter((l) => !re.test(l.trim()));
    const segments = x.paymentTermsRaw.split(/#.+#/);
    const endsWithBreak = /^\s*\n/.test(segments[segments.length - 1] ?? '');
    c.check('BR-DE-18', bad.length === 0 && endsWithBreak, bad.length ? bad.join(' | ') : '');
  }
  const sepa = inv.paymentMeans.filter((pm) => pm.code === '58');
  c.each('BR-DE-19', sepa.filter((pm) => has(pm.iban)), (pm) => ibanValid(pm.iban), (pm) => pm.iban);
  c.each('BR-DE-20', inv.paymentMeans.filter((pm) => pm.code === '59' && has(pm.debitedAccount)), (pm) => ibanValid(pm.debitedAccount), (pm) => pm.debitedAccount);
  c.check('BR-DE-21', describeProfile(inv.customizationId).standard === 'xrechnung', inv.customizationId);
  const names = inv.attachments.map((a) => a.filename).filter(has);
  if (names.length) c.check('BR-DE-22', new Set(names).size === names.length, names.filter((n, i) => names.indexOf(n) !== i).join(', '));
  const ct = inv.paymentMeans.filter((pm) => ['30', '58'].includes(pm.code));
  const card = inv.paymentMeans.filter((pm) => ['48', '54', '55'].includes(pm.code));
  const dd = inv.paymentMeans.filter((pm) => pm.code === '59');
  c.each('BR-DE-23-a', ct, (pm) => has(pm.iban), (pm) => pm.code);
  c.each('BR-DE-23-b', ct, (pm) => !has(pm.card) && !has(pm.mandate) && !has(pm.debitedAccount), (pm) => pm.code);
  c.each('BR-DE-24-a', card, (pm) => has(pm.card), (pm) => pm.code);
  c.each('BR-DE-24-b', card, (pm) => !has(pm.iban) && !has(pm.mandate) && !has(pm.debitedAccount), (pm) => pm.code);
  c.each('BR-DE-25-a', dd, (pm) => has(pm.mandate) || has(pm.debitedAccount), (pm) => pm.code);
  c.each('BR-DE-25-b', dd, (pm) => !has(pm.iban) && !has(pm.card), (pm) => pm.code);
  if (inv.typeCode === '384') c.check('BR-DE-26', inv.precedingInvoices.length > 0);
  if (has(s.contact.phone)) c.check('BR-DE-27', (s.contact.phone.match(/\d/g) ?? []).length >= 3, s.contact.phone);
  if (has(s.contact.email)) {
    const e = s.contact.email.trim();
    const parts = e.split('@');
    const ok = parts.length === 2 && parts[0].length >= 2 && parts[1].length >= 2 && !/[\s]/.test(e) && !/^\.|\.$/.test(parts[0]) && !/^\.|\.$/.test(parts[1]) && !e.startsWith('.') && !e.endsWith('.');
    c.check('BR-DE-28', ok, e);
  }
  if (dd.length) {
    c.check('BR-DE-30', has(x.creditorId));
    c.check('BR-DE-31', dd.some((pm) => has(pm.debitedAccount)));
  }
  c.check('BR-DE-TMP-32', has(inv.delivery.date) || x.invoicePeriodPresent || (x.linePeriodPresent.length > 0 && x.linePeriodPresent.every(Boolean)));
}

export interface RulesReport {
  findings: Finding[];
  profile: ReturnType<typeof describeProfile>;
  isXRechnung: boolean;
}

/** Runs the shared plausibility checks plus the extended rule set. */
export function runRules(inv: Invoice, doc: Document, lang: RuleLang): RulesReport {
  const profile = describeProfile(inv.customizationId);
  const isXRechnung = profile.standard === 'xrechnung';
  const c = new Collector(lang);
  // French rule texts are written for France, whose wording (avoir, SIREN) differs from Belgian French.
  for (const r of runChecks(inv, lang === 'fr' ? 'fr-FR' : lang)) c.fromCheck(r);
  if (profile.meetsEn16931 && inv.syntax !== 'CII-ZUGFeRD1') {
    const x = extras(doc, inv);
    documentRules(inv, x, c);
    lineRules(inv, x, c);
    allowanceRules(inv, c);
    vatCategoryRules(inv, c, lang);
    decimalRules(inv, c);
    if (isXRechnung) xrechnungRules(inv, x, c);
  }
  return { findings: c.findings, profile, isXRechnung };
}

/** Every rule this module can report, e.g. to show which rules a report covers. */
export function coveredRules(): string[] {
  return Object.keys(RULE_TEXTS);
}
