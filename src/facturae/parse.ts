import { all, first, localName, parseXml, rootName, text, texts, type XmlParser } from '../xml.ts';

/*
 * Facturae 3.0 to 3.2.2, the Spanish e-invoice format (Orden HAP/1650/2015 and its predecessors), read from the
 * element structure of the official XSD (facturae.gob.es). Every version uses its own namespace but the same element
 * names, so lookups go by local name. One file holds one invoice (Modality I) or a batch (Modality L) of invoices
 * between the same seller and buyer. Amounts stay strings exactly as written; checks.ts does the arithmetic.
 */

export interface FeAddress {
  street: string;
  postCode: string; // PostCode in Spain, PostCodeAndTown abroad
  town: string;
  province: string;
  country: string; // ISO 3166-1 alpha-3, e.g. ESP
  overseas: boolean;
}

export interface FeCentre {
  code: string; // DIR3 code for public bodies
  role: string; // RoleTypeCode: 01 Fiscal (oficina contable), 02 Receptor (órgano gestor), 03 Pagador (unidad tramitadora), 04 Comprador ...
  name: string;
  description: string;
  address: FeAddress | null;
}

export interface FeParty {
  taxId: string;
  personType: string; // F = persona física, J = persona jurídica
  residence: string; // R = residente en España, U = residente en la UE, E = extranjero
  name: string; // CorporateName, or Name FirstSurname SecondSurname
  tradeName: string;
  registration: string;
  address: FeAddress | null;
  contact: { phone: string; email: string; web: string; person: string };
  partyId: string;
  centres: FeCentre[];
}

export interface FeTax {
  type: string; // TaxTypeCode: 01 IVA, 02 IPSI, 03 IGIC, 04 IRPF ...
  rate: string;
  base: string;
  amount: string;
  surchargeRate: string; // recargo de equivalencia
  surchargeAmount: string;
}

export interface FeAdjustment {
  reason: string;
  rate: string;
  amount: string;
}

export interface FeLine {
  description: string;
  quantity: string;
  unit: string; // UnitOfMeasure code, 01 = unidades
  unitPrice: string;
  totalCost: string;
  discounts: FeAdjustment[];
  charges: FeAdjustment[];
  gross: string;
  taxes: FeTax[];
  withheld: FeTax[];
  articleCode: string;
  periodStart: string;
  periodEnd: string;
  transactionDate: string;
  info: string;
  specialEvent: { code: string; reason: string } | null;
  references: { label: string; value: string }[];
  deliveryNotes: { number: string; date: string }[];
}

export interface FeInstallment {
  dueDate: string;
  amount: string;
  means: string; // PaymentMeans: 04 transferencia, 02 recibo domiciliado ...
  iban: string;
  account: string;
  bic: string;
  reference: string;
  debitIban: string;
  info: string;
}

export interface FeAttachment {
  format: string;
  compression: string;
  encoding: string;
  description: string;
  data: string; // base64 as written, whitespace removed
}

export interface FeInvoice {
  number: string;
  series: string;
  docType: string; // FC completa, FA abreviada, AF autofactura
  invoiceClass: string; // OO original, OR rectificativa, OC recapitulativa, CO/CR/CC copies
  corrective: {
    number: string;
    series: string;
    reasonCode: string;
    reasonDescription: string;
    periodStart: string;
    periodEnd: string;
    method: string;
    methodDescription: string;
    additionalReason: string;
    issueDate: string;
  } | null;
  issueDate: string;
  operationDate: string;
  placeOfIssue: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  taxCurrency: string;
  exchangeRate: string;
  language: string;
  description: string;
  references: { label: string; value: string }[];
  taxes: FeTax[];
  withheld: FeTax[];
  totals: {
    gross: string;
    generalDiscounts: FeAdjustment[];
    generalCharges: FeAdjustment[];
    totalDiscounts: string;
    totalCharges: string;
    beforeTaxes: string;
    taxOutputs: string;
    taxesWithheld: string;
    invoiceTotal: string;
    subsidies: FeAdjustment[];
    paymentsOnAccount: { date: string; amount: string }[];
    totalPaymentsOnAccount: string;
    reimbursable: string[];
    totalReimbursable: string;
    financialExpenses: string;
    outstanding: string;
    amountsWithheld: FeAdjustment | null;
    executable: string;
    paymentInKind: FeAdjustment | null;
  };
  lines: FeLine[];
  installments: FeInstallment[];
  legalLiterals: string[];
  attachments: FeAttachment[];
  relatedInvoice: string;
  additionalInfo: string;
}

export interface Facturae {
  version: string; // SchemaVersion as written, e.g. 3.2.2
  namespace: string;
  modality: string; // I individual, L lote
  issuerType: string; // EM emisor, RE receptor, TE tercero
  thirdParty: FeParty | null;
  batch: { id: string; count: string; totalInvoices: string; totalOutstanding: string; totalExecutable: string; currency: string };
  factoring: boolean;
  seller: FeParty;
  buyer: FeParty;
  invoices: FeInvoice[];
  signed: boolean;
}

export class NotFacturaeError extends Error {}

const amount = (el: Element | null, path: string) => text(el, `${path}/TotalAmount`) || text(el, path);

function addressOf(el: Element | null): FeAddress | null {
  const es = first(el, 'AddressInSpain');
  if (es) return { street: text(es, 'Address'), postCode: text(es, 'PostCode'), town: text(es, 'Town'), province: text(es, 'Province'), country: text(es, 'CountryCode'), overseas: false };
  const os = first(el, 'OverseasAddress');
  if (os) return { street: text(os, 'Address'), postCode: text(os, 'PostCodeAndTown'), town: '', province: text(os, 'Province'), country: text(os, 'CountryCode'), overseas: true };
  return null;
}

function registration(el: Element | null): string {
  if (!el) return '';
  const parts: [string, string][] = [
    ['', text(el, 'RegisterOfCompaniesLocation')],
    ['Tomo', text(el, 'Volume')],
    ['Libro', text(el, 'Book')],
    ['Sección', text(el, 'Section')],
    ['Folio', text(el, 'Folio')],
    ['Hoja', text(el, 'Sheet')],
    ['', text(el, 'AdditionalRegistrationData')],
  ];
  return parts
    .filter(([, v]) => v)
    .map(([k, v]) => (k ? `${k} ${v}` : v))
    .join(', ');
}

function party(el: Element | null): FeParty {
  const legal = first(el, 'LegalEntity');
  const person = first(el, 'Individual');
  const holder = legal ?? person;
  const name = legal
    ? text(legal, 'CorporateName')
    : [text(person, 'Name'), text(person, 'FirstSurname'), text(person, 'SecondSurname')].filter(Boolean).join(' ');
  const c = first(holder, 'ContactDetails');
  return {
    taxId: text(el, 'TaxIdentification/TaxIdentificationNumber'),
    personType: text(el, 'TaxIdentification/PersonTypeCode'),
    residence: text(el, 'TaxIdentification/ResidenceTypeCode'),
    name,
    tradeName: text(legal, 'TradeName'),
    registration: registration(first(legal, 'RegistrationData')),
    address: addressOf(holder),
    contact: { phone: text(c, 'Telephone'), email: text(c, 'ElectronicMail'), web: text(c, 'WebAddress'), person: text(c, 'ContactPersons') },
    partyId: text(el, 'PartyIdentification'),
    centres: all(el, 'AdministrativeCentres/AdministrativeCentre').map((a) => ({
      code: text(a, 'CentreCode'),
      role: text(a, 'RoleTypeCode'),
      name: [text(a, 'Name'), text(a, 'FirstSurname'), text(a, 'SecondSurname')].filter(Boolean).join(' '),
      description: text(a, 'CentreDescription'),
      address: addressOf(a),
    })),
  };
}

function taxes(el: Element | null, path: string): FeTax[] {
  return all(el, path).map((t) => ({
    type: text(t, 'TaxTypeCode'),
    rate: text(t, 'TaxRate'),
    base: amount(t, 'TaxableBase'),
    amount: amount(t, 'TaxAmount'),
    surchargeRate: text(t, 'EquivalenceSurcharge'),
    surchargeAmount: amount(t, 'EquivalenceSurchargeAmount'),
  }));
}

function adjustments(el: Element | null, path: string, prefix: 'Discount' | 'Charge' | 'Subsidy'): FeAdjustment[] {
  const reason = prefix === 'Subsidy' ? 'SubsidyDescription' : `${prefix}Reason`;
  return all(el, path).map((a) => ({ reason: text(a, reason), rate: text(a, `${prefix}Rate`), amount: text(a, `${prefix}Amount`) }));
}

/** Contract, transaction and file references a line or invoice may carry; the receiver's ones matter most to public bodies. */
function references(el: Element | null, fields: [string, string][]): { label: string; value: string }[] {
  return fields.map(([name, label]) => ({ label, value: text(el, name) })).filter((r) => r.value);
}

const LINE_REFS: [string, string][] = [
  ['IssuerContractReference', 'issuerContract'],
  ['IssuerTransactionReference', 'issuerTransaction'],
  ['ReceiverContractReference', 'receiverContract'],
  ['ReceiverTransactionReference', 'receiverTransaction'],
  ['FileReference', 'file'],
  ['SequenceNumber', 'sequence'],
];
const INVOICE_REFS: [string, string][] = [
  ['ReceiverTransactionReference', 'receiverTransaction'],
  ['ReceiverContractReference', 'receiverContract'],
  ['FileReference', 'file'],
];

function line(l: Element): FeLine {
  const ev = first(l, 'SpecialTaxableEvent');
  return {
    description: text(l, 'ItemDescription'),
    quantity: text(l, 'Quantity'),
    unit: text(l, 'UnitOfMeasure'),
    unitPrice: text(l, 'UnitPriceWithoutTax'),
    totalCost: text(l, 'TotalCost'),
    discounts: adjustments(l, 'DiscountsAndRebates/Discount', 'Discount'),
    charges: adjustments(l, 'Charges/Charge', 'Charge'),
    gross: text(l, 'GrossAmount'),
    taxes: taxes(l, 'TaxesOutputs/Tax'),
    withheld: taxes(l, 'TaxesWithheld/Tax'),
    articleCode: text(l, 'ArticleCode'),
    periodStart: text(l, 'LineItemPeriod/StartDate'),
    periodEnd: text(l, 'LineItemPeriod/EndDate'),
    transactionDate: text(l, 'TransactionDate'),
    info: text(l, 'AdditionalLineItemInformation'),
    specialEvent: ev ? { code: text(ev, 'SpecialTaxableEventCode'), reason: text(ev, 'SpecialTaxableEventReason') } : null,
    references: references(l, LINE_REFS),
    deliveryNotes: all(l, 'DeliveryNotesReferences/DeliveryNote').map((d) => ({ number: text(d, 'DeliveryNoteNumber'), date: text(d, 'DeliveryNoteDate') })),
  };
}

function account(el: Element | null): { iban: string; account: string; bic: string } {
  return { iban: text(el, 'IBAN'), account: text(el, 'AccountNumber'), bic: text(el, 'BIC') };
}

function invoice(inv: Element): FeInvoice {
  const head = first(inv, 'InvoiceHeader');
  const corr = first(head, 'Corrective');
  const issue = first(inv, 'InvoiceIssueData');
  const tot = first(inv, 'InvoiceTotals');
  const withheldAmounts = first(tot, 'AmountsWithheld');
  const inKind = first(tot, 'PaymentInKind');
  const extra = first(inv, 'AdditionalData');
  return {
    number: text(head, 'InvoiceNumber'),
    series: text(head, 'InvoiceSeriesCode'),
    docType: text(head, 'InvoiceDocumentType'),
    invoiceClass: text(head, 'InvoiceClass'),
    corrective: corr
      ? {
          number: text(corr, 'InvoiceNumber'),
          series: text(corr, 'InvoiceSeriesCode'),
          reasonCode: text(corr, 'ReasonCode'),
          reasonDescription: text(corr, 'ReasonDescription'),
          periodStart: text(corr, 'TaxPeriod/StartDate'),
          periodEnd: text(corr, 'TaxPeriod/EndDate'),
          method: text(corr, 'CorrectionMethod'),
          methodDescription: text(corr, 'CorrectionMethodDescription'),
          additionalReason: text(corr, 'AdditionalReasonDescription'),
          issueDate: text(corr, 'InvoiceIssueDate'),
        }
      : null,
    issueDate: text(issue, 'IssueDate'),
    operationDate: text(issue, 'OperationDate'),
    placeOfIssue: [text(issue, 'PlaceOfIssue/PostCode'), text(issue, 'PlaceOfIssue/PlaceOfIssueDescription')].filter(Boolean).join(' '),
    periodStart: text(issue, 'InvoicingPeriod/StartDate'),
    periodEnd: text(issue, 'InvoicingPeriod/EndDate'),
    currency: text(issue, 'InvoiceCurrencyCode'),
    taxCurrency: text(issue, 'TaxCurrencyCode'),
    exchangeRate: text(issue, 'ExchangeRateDetails/ExchangeRate'),
    language: text(issue, 'LanguageName'),
    description: text(issue, 'InvoiceDescription'),
    references: references(issue, INVOICE_REFS),
    taxes: taxes(inv, 'TaxesOutputs/Tax'),
    withheld: taxes(inv, 'TaxesWithheld/Tax'),
    totals: {
      gross: text(tot, 'TotalGrossAmount'),
      generalDiscounts: adjustments(tot, 'GeneralDiscounts/Discount', 'Discount'),
      generalCharges: adjustments(tot, 'GeneralSurcharges/Charge', 'Charge'),
      totalDiscounts: text(tot, 'TotalGeneralDiscounts'),
      totalCharges: text(tot, 'TotalGeneralSurcharges'),
      beforeTaxes: text(tot, 'TotalGrossAmountBeforeTaxes'),
      taxOutputs: text(tot, 'TotalTaxOutputs'),
      taxesWithheld: text(tot, 'TotalTaxesWithheld'),
      invoiceTotal: text(tot, 'InvoiceTotal'),
      subsidies: adjustments(tot, 'Subsidies/Subsidy', 'Subsidy'),
      paymentsOnAccount: all(tot, 'PaymentsOnAccount/PaymentOnAccount').map((p) => ({ date: text(p, 'PaymentOnAccountDate'), amount: text(p, 'PaymentOnAccountAmount') })),
      totalPaymentsOnAccount: text(tot, 'TotalPaymentsOnAccount'),
      reimbursable: texts(tot, 'ReimbursableExpenses/ReimbursableExpenses/ReimbursableExpensesAmount'),
      totalReimbursable: text(tot, 'TotalReimbursableExpenses'),
      financialExpenses: text(tot, 'TotalFinancialExpenses'),
      outstanding: text(tot, 'TotalOutstandingAmount'),
      amountsWithheld: withheldAmounts
        ? { reason: text(withheldAmounts, 'WithholdingReason'), rate: text(withheldAmounts, 'WithholdingRate'), amount: text(withheldAmounts, 'WithholdingAmount') }
        : null,
      executable: text(tot, 'TotalExecutableAmount'),
      paymentInKind: inKind ? { reason: text(inKind, 'PaymentInKindReason'), rate: '', amount: text(inKind, 'PaymentInKindAmount') } : null,
    },
    lines: all(inv, 'Items/InvoiceLine').map(line),
    installments: all(inv, 'PaymentDetails/Installment').map((i) => {
      const credit = account(first(i, 'AccountToBeCredited'));
      return {
        dueDate: text(i, 'InstallmentDueDate'),
        amount: text(i, 'InstallmentAmount'),
        means: text(i, 'PaymentMeans'),
        iban: credit.iban,
        account: credit.account,
        bic: credit.bic,
        reference: text(i, 'PaymentReconciliationReference'),
        debitIban: account(first(i, 'AccountToBeDebited')).iban,
        info: text(i, 'CollectionAdditionalInformation'),
      };
    }),
    legalLiterals: texts(inv, 'LegalLiterals/LegalReference'),
    attachments: all(extra, 'RelatedDocuments/Attachment').map((a) => ({
      format: text(a, 'AttachmentFormat'),
      compression: text(a, 'AttachmentCompressionAlgorithm'),
      encoding: text(a, 'AttachmentEncoding'),
      description: text(a, 'AttachmentDescription'),
      data: (first(a, 'AttachmentData')?.textContent ?? '').replace(/\s+/g, ''),
    })),
    relatedInvoice: text(extra, 'RelatedInvoice'),
    additionalInfo: text(extra, 'InvoiceAdditionalInformation'),
  };
}

export function isFacturae(doc: Document): boolean {
  return rootName(doc) === 'Facturae';
}

export function readFacturae(doc: Document): Facturae {
  if (!isFacturae(doc)) throw new NotFacturaeError(rootName(doc));
  const root = doc.documentElement;
  const fh = first(root, 'FileHeader');
  const batch = first(fh, 'Batch');
  const third = first(fh, 'ThirdParty');
  return {
    version: text(fh, 'SchemaVersion'),
    namespace: root.namespaceURI ?? '',
    modality: text(fh, 'Modality'),
    issuerType: text(fh, 'InvoiceIssuerType'),
    thirdParty: third ? party(third) : null,
    batch: {
      id: text(batch, 'BatchIdentifier'),
      count: text(batch, 'InvoicesCount'),
      totalInvoices: amount(batch, 'TotalInvoicesAmount'),
      totalOutstanding: amount(batch, 'TotalOutstandingAmount'),
      totalExecutable: amount(batch, 'TotalExecutableAmount'),
      currency: text(batch, 'InvoiceCurrencyCode'),
    },
    factoring: Boolean(first(fh, 'FactoringAssignmentData')),
    seller: party(first(root, 'Parties/SellerParty')),
    buyer: party(first(root, 'Parties/BuyerParty')),
    invoices: all(root, 'Invoices/Invoice').map(invoice),
    signed: Array.from(root.childNodes).some((n) => n.nodeType === 1 && localName(n as Element) === 'Signature'),
  };
}

export function parseFacturae(xmlText: string, parser: XmlParser): Facturae {
  return readFacturae(parseXml(xmlText, parser));
}

/** Series and number the way FACe and most programs print them: the series code directly in front of the number. */
export function fullNumber(inv: Pick<FeInvoice, 'series' | 'number'>): string {
  return `${inv.series}${inv.number}`;
}
