import { all, attr, first, rootName, text, texts } from '../xml.ts';
import type { Address, AllowanceCharge, Attachment, Invoice, Line, Party, PaymentMeans } from './model.ts';

/*
 * One parser for CII D16B (ZUGFeRD 2.x, Factur-X, XRechnung CII) and the older
 * ZUGFeRD 1.0 "CrossIndustryDocument". The 1.0 schema renamed most containers
 * (e.g. ApplicableSupplyChainTradeAgreement instead of
 * ApplicableHeaderTradeAgreement) but kept leaf names, so each step lists both.
 */
const P = {
  context: 'ExchangedDocumentContext|SpecifiedExchangedDocumentContext',
  header: 'ExchangedDocument|HeaderExchangedDocument',
  tx: 'SupplyChainTradeTransaction|SpecifiedSupplyChainTradeTransaction',
  agreement: 'ApplicableHeaderTradeAgreement|ApplicableSupplyChainTradeAgreement',
  delivery: 'ApplicableHeaderTradeDelivery|ApplicableSupplyChainTradeDelivery',
  settlement: 'ApplicableHeaderTradeSettlement|ApplicableSupplyChainTradeSettlement',
  summation: 'SpecifiedTradeSettlementHeaderMonetarySummation|SpecifiedTradeSettlementMonetarySummation',
  lineAgreement: 'SpecifiedLineTradeAgreement|SpecifiedSupplyChainTradeAgreement',
  lineDelivery: 'SpecifiedLineTradeDelivery|SpecifiedSupplyChainTradeDelivery',
  lineSettlement: 'SpecifiedLineTradeSettlement|SpecifiedSupplyChainTradeSettlement',
  lineSummation: 'SpecifiedTradeSettlementLineMonetarySummation|SpecifiedTradeSettlementMonetarySummation',
};

/** CII dates are qualified by a format code; 102 = CCYYMMDD is the only one EN 16931 allows. */
export function ciiDate(el: Element | null): string {
  const s = text(el, 'DateTimeString') || text(el);
  const fmt = attr(el, 'DateTimeString', 'format') || el?.getAttribute('format') || '102';
  if (fmt === '102' && /^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (fmt === '610' && /^\d{6}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
  return s;
}

function address(el: Element | null): Address {
  return {
    lines: [text(el, 'LineOne'), text(el, 'LineTwo'), text(el, 'LineThree')].filter(Boolean),
    city: text(el, 'CityName'),
    postcode: text(el, 'PostcodeCode'),
    subdivision: text(el, 'CountrySubDivisionName'),
    country: text(el, 'CountryID'),
  };
}

function party(p: Element | null): Party {
  const regs = all(p, 'SpecifiedTaxRegistration/ID');
  const vat = regs.find((r) => (r.getAttribute('schemeID') ?? '').toUpperCase() === 'VA');
  const fc = regs.find((r) => (r.getAttribute('schemeID') ?? '').toUpperCase() === 'FC');
  const endpoint = first(p, 'URIUniversalCommunication/URIID');
  const ids = [
    ...all(p, 'ID').map((e) => ({ value: text(e), scheme: '' })),
    ...all(p, 'GlobalID').map((e) => ({ value: text(e), scheme: e.getAttribute('schemeID') ?? '' })),
  ];
  return {
    name: text(p, 'Name'),
    tradingName: text(p, 'SpecifiedLegalOrganization/TradingBusinessName'),
    ids,
    legalId: text(p, 'SpecifiedLegalOrganization/ID'),
    vatId: vat ? text(vat) : '',
    taxNumber: fc ? text(fc) : '',
    legalInfo: texts(p, 'Description').join(' '),
    endpoint: endpoint ? { value: text(endpoint), scheme: endpoint.getAttribute('schemeID') ?? '' } : null,
    address: address(first(p, 'PostalTradeAddress')),
    contact: {
      name: text(p, 'DefinedTradeContact/PersonName') || text(p, 'DefinedTradeContact/DepartmentName'),
      phone: text(p, 'DefinedTradeContact/TelephoneUniversalCommunication/CompleteNumber'),
      email: text(p, 'DefinedTradeContact/EmailURIUniversalCommunication/URIID'),
    },
  };
}

function allowanceCharge(el: Element): AllowanceCharge {
  const indicator = text(el, 'ChargeIndicator/Indicator') || text(el, 'ChargeIndicator');
  return {
    isCharge: indicator.toLowerCase() === 'true',
    amount: text(el, 'ActualAmount'),
    base: text(el, 'BasisAmount'),
    percent: text(el, 'CalculationPercent'),
    reason: text(el, 'Reason'),
    reasonCode: text(el, 'ReasonCode'),
    vatCategory: text(el, 'CategoryTradeTax/CategoryCode'),
    vatRate: text(el, 'CategoryTradeTax/RateApplicablePercent') || text(el, 'CategoryTradeTax/ApplicablePercent'),
  };
}

function line(el: Element): Line {
  const product = first(el, 'SpecifiedTradeProduct');
  const agr = first(el, P.lineAgreement);
  const del = first(el, P.lineDelivery);
  const set = first(el, P.lineSettlement);
  const qty = first(del, 'BilledQuantity');
  const tax = first(set, 'ApplicableTradeTax');
  return {
    id: text(el, 'AssociatedDocumentLineDocument/LineID'),
    note: texts(el, 'AssociatedDocumentLineDocument/IncludedNote/Content').join('\n'),
    name: text(product, 'Name'),
    description: text(product, 'Description'),
    sellerItemId: text(product, 'SellerAssignedID'),
    buyerItemId: text(product, 'BuyerAssignedID'),
    standardItemId: text(product, 'GlobalID'),
    quantity: text(qty),
    unit: qty?.getAttribute('unitCode') ?? '',
    netPrice: text(agr, 'NetPriceProductTradePrice/ChargeAmount'),
    priceBaseQty: text(agr, 'NetPriceProductTradePrice/BasisQuantity'),
    grossPrice: text(agr, 'GrossPriceProductTradePrice/ChargeAmount'),
    amount: text(set, `${P.lineSummation}/LineTotalAmount`),
    vatCategory: text(tax, 'CategoryCode'),
    vatRate: text(tax, 'RateApplicablePercent') || text(tax, 'ApplicablePercent'),
    periodStart: ciiDate(first(set, 'BillingSpecifiedPeriod/StartDateTime')),
    periodEnd: ciiDate(first(set, 'BillingSpecifiedPeriod/EndDateTime')),
    orderLineRef: text(agr, 'BuyerOrderReferencedDocument/LineID'),
    allowancesCharges: all(set, 'SpecifiedTradeAllowanceCharge').map(allowanceCharge),
    properties: all(product, 'ApplicableProductCharacteristic').map((c) => ({
      name: text(c, 'Description'),
      value: text(c, 'Value'),
    })),
    subLines: [],
  };
}

function paymentMeans(el: Element, remittance: string, mandate: string): PaymentMeans {
  return {
    code: text(el, 'TypeCode'),
    text: text(el, 'Information'),
    remittance,
    iban: text(el, 'PayeePartyCreditorFinancialAccount/IBANID') || text(el, 'PayeePartyCreditorFinancialAccount/ProprietaryID'),
    accountName: text(el, 'PayeePartyCreditorFinancialAccount/AccountName'),
    bic: text(el, 'PayeeSpecifiedCreditorFinancialInstitution/BICID'),
    card: text(el, 'ApplicableTradeSettlementFinancialCard/ID'),
    mandate,
    debitedAccount: text(el, 'PayerPartyDebtorFinancialAccount/IBANID'),
  };
}

function attachment(el: Element): Attachment {
  const bin = first(el, 'AttachmentBinaryObject');
  return {
    id: text(el, 'IssuerAssignedID'),
    description: text(el, 'Name'),
    filename: bin?.getAttribute('filename') ?? '',
    mimeCode: bin?.getAttribute('mimeCode') ?? '',
    base64: bin ? (bin.textContent ?? '').replace(/\s+/g, '') : '',
    uri: text(el, 'URIID'),
  };
}

/** BT-110 may appear twice (document and tax currency); prefer the one in invoice currency. */
function taxTotal(summation: Element | null, currency: string): string {
  const totals = all(summation, 'TaxTotalAmount');
  const match = totals.find((t) => (t.getAttribute('currencyID') ?? currency) === currency);
  return text(match ?? totals[0] ?? null);
}

export function parseCii(doc: Document): Invoice {
  const root = doc.documentElement;
  const isV1 = rootName(doc) === 'CrossIndustryDocument';
  const ctx = first(root, P.context);
  const hdr = first(root, P.header);
  const tx = first(root, P.tx);
  const agr = first(tx, P.agreement);
  const del = first(tx, P.delivery);
  const set = first(tx, P.settlement);
  const sum = first(set, P.summation);
  const terms = all(set, 'SpecifiedTradePaymentTerms');
  const currency = text(set, 'InvoiceCurrencyCode');
  const payee = first(set, 'PayeeTradeParty');
  const taxRep = first(agr, 'SellerTaxRepresentativeTradeParty');
  const shipTo = first(del, 'ShipToTradeParty');
  const typeCode = text(hdr, 'TypeCode');
  const remittance = texts(set, 'PaymentReference').join(' ');
  const mandate = text(terms[0] ?? null, 'DirectDebitMandateID');

  return {
    syntax: isV1 ? 'CII-ZUGFeRD1' : 'CII',
    isCreditNote: typeCode === '381',
    customizationId: text(ctx, 'GuidelineSpecifiedDocumentContextParameter/ID'),
    profileId: text(ctx, 'BusinessProcessSpecifiedDocumentContextParameter/ID'),
    number: text(hdr, 'ID'),
    issueDate: ciiDate(first(hdr, 'IssueDateTime')),
    typeCode,
    currency,
    taxCurrency: text(set, 'TaxCurrencyCode'),
    taxPointDate: ciiDate(first(set, 'ApplicableTradeTax/TaxPointDate')),
    dueDate: ciiDate(first(terms[0] ?? null, 'DueDateDateTime')),
    buyerReference: text(agr, 'BuyerReference'),
    projectRef: text(agr, 'SpecifiedProcuringProject/ID'),
    contractRef: text(agr, 'ContractReferencedDocument/IssuerAssignedID') || text(agr, 'ContractReferencedDocument/ID'),
    orderRef: text(agr, 'BuyerOrderReferencedDocument/IssuerAssignedID') || text(agr, 'BuyerOrderReferencedDocument/ID'),
    salesOrderRef: text(agr, 'SellerOrderReferencedDocument/IssuerAssignedID'),
    receivingAdviceRef: text(del, 'ReceivingAdviceReferencedDocument/IssuerAssignedID'),
    despatchAdviceRef: text(del, 'DespatchAdviceReferencedDocument/IssuerAssignedID'),
    accountingRef: text(set, 'ReceivableSpecifiedTradeAccountingAccount/ID'),
    paymentTerms: terms.flatMap((t) => texts(t, 'Description')).join('\n'),
    notes: all(hdr, 'IncludedNote').flatMap((n) => texts(n, 'Content')),
    precedingInvoices: all(set, 'InvoiceReferencedDocument').map((r) => ({
      number: text(r, 'IssuerAssignedID'),
      date: ciiDate(first(r, 'FormattedIssueDateTime/DateTimeString')),
    })),
    periodStart: ciiDate(first(set, 'BillingSpecifiedPeriod/StartDateTime')),
    periodEnd: ciiDate(first(set, 'BillingSpecifiedPeriod/EndDateTime')),
    seller: party(first(agr, 'SellerTradeParty')),
    buyer: party(first(agr, 'BuyerTradeParty')),
    payee: payee
      ? { name: text(payee, 'Name'), id: text(payee, 'ID'), legalId: text(payee, 'SpecifiedLegalOrganization/ID') }
      : null,
    taxRepresentative: taxRep ? { name: text(taxRep, 'Name'), vatId: text(taxRep, 'SpecifiedTaxRegistration/ID') } : null,
    delivery: {
      name: text(shipTo, 'Name'),
      date: ciiDate(first(del, 'ActualDeliverySupplyChainEvent/OccurrenceDateTime')),
      locationId: text(shipTo, 'ID') || text(shipTo, 'GlobalID'),
      address: shipTo ? address(first(shipTo, 'PostalTradeAddress')) : null,
    },
    paymentMeans: all(set, 'SpecifiedTradeSettlementPaymentMeans').map((pm) => paymentMeans(pm, remittance, mandate)),
    allowancesCharges: all(set, 'SpecifiedTradeAllowanceCharge').map(allowanceCharge),
    vat: all(set, 'ApplicableTradeTax').map((t) => ({
      category: text(t, 'CategoryCode'),
      rate: text(t, 'RateApplicablePercent') || text(t, 'ApplicablePercent'),
      taxable: text(t, 'BasisAmount'),
      tax: text(t, 'CalculatedAmount'),
      exemptionReason: text(t, 'ExemptionReason'),
      exemptionCode: text(t, 'ExemptionReasonCode'),
    })),
    totals: {
      lineTotal: text(sum, 'LineTotalAmount'),
      allowanceTotal: text(sum, 'AllowanceTotalAmount'),
      chargeTotal: text(sum, 'ChargeTotalAmount'),
      taxExclusive: text(sum, 'TaxBasisTotalAmount'),
      taxTotal: taxTotal(sum, currency),
      taxInclusive: text(sum, 'GrandTotalAmount'),
      prepaid: text(sum, 'TotalPrepaidAmount'),
      rounding: text(sum, 'RoundingAmount'),
      payable: text(sum, 'DuePayableAmount'),
    },
    lines: all(tx, 'IncludedSupplyChainTradeLineItem').map(line),
    attachments: all(agr, 'AdditionalReferencedDocument').map(attachment),
  };
}
