import { all, attr, first, localName, text, texts } from '../xml.ts';
import type { Address, AllowanceCharge, Attachment, Invoice, Line, Party, PaymentMeans } from './model.ts';

function address(el: Element | null): Address {
  return {
    lines: [text(el, 'StreetName'), text(el, 'AdditionalStreetName'), ...texts(el, 'AddressLine/Line')].filter(Boolean),
    city: text(el, 'CityName'),
    postcode: text(el, 'PostalZone'),
    subdivision: text(el, 'CountrySubentity'),
    country: text(el, 'Country/IdentificationCode'),
  };
}

function party(p: Element | null): Party {
  const taxSchemes = all(p, 'PartyTaxScheme');
  const vat = taxSchemes.find((t) => text(t, 'TaxScheme/ID').toUpperCase() === 'VAT');
  const other = taxSchemes.find((t) => t !== vat);
  const endpoint = first(p, 'EndpointID');
  return {
    name: text(p, 'PartyLegalEntity/RegistrationName') || text(p, 'PartyName/Name'),
    tradingName: text(p, 'PartyName/Name'),
    ids: all(p, 'PartyIdentification/ID').map((e) => ({ value: text(e), scheme: e.getAttribute('schemeID') ?? '' })),
    legalId: text(p, 'PartyLegalEntity/CompanyID'),
    vatId: vat ? text(vat, 'CompanyID') : '',
    taxNumber: other ? text(other, 'CompanyID') : '',
    legalInfo: text(p, 'PartyLegalEntity/CompanyLegalForm'),
    endpoint: endpoint ? { value: text(endpoint), scheme: endpoint.getAttribute('schemeID') ?? '' } : null,
    address: address(first(p, 'PostalAddress')),
    contact: {
      name: text(p, 'Contact/Name'),
      phone: text(p, 'Contact/Telephone'),
      email: text(p, 'Contact/ElectronicMail'),
    },
  };
}

function allowanceCharge(el: Element): AllowanceCharge {
  return {
    isCharge: text(el, 'ChargeIndicator').toLowerCase() === 'true',
    amount: text(el, 'Amount'),
    base: text(el, 'BaseAmount'),
    percent: text(el, 'MultiplierFactorNumeric'),
    reason: text(el, 'AllowanceChargeReason'),
    reasonCode: text(el, 'AllowanceChargeReasonCode'),
    vatCategory: text(el, 'TaxCategory/ID'),
    vatRate: text(el, 'TaxCategory/Percent'),
  };
}

function line(el: Element): Line {
  const qty = first(el, 'InvoicedQuantity|CreditedQuantity');
  const item = first(el, 'Item');
  return {
    id: text(el, 'ID'),
    note: texts(el, 'Note').join('\n'),
    name: text(item, 'Name'),
    description: text(item, 'Description'),
    sellerItemId: text(item, 'SellersItemIdentification/ID'),
    buyerItemId: text(item, 'BuyersItemIdentification/ID'),
    standardItemId: text(item, 'StandardItemIdentification/ID'),
    quantity: text(qty),
    unit: qty?.getAttribute('unitCode') ?? '',
    netPrice: text(el, 'Price/PriceAmount'),
    priceBaseQty: text(el, 'Price/BaseQuantity'),
    grossPrice: text(el, 'Price/AllowanceCharge/BaseAmount'),
    amount: text(el, 'LineExtensionAmount'),
    vatCategory: text(item, 'ClassifiedTaxCategory/ID'),
    vatRate: text(item, 'ClassifiedTaxCategory/Percent'),
    periodStart: text(el, 'InvoicePeriod/StartDate'),
    periodEnd: text(el, 'InvoicePeriod/EndDate'),
    orderLineRef: text(el, 'OrderLineReference/LineID'),
    allowancesCharges: all(el, 'AllowanceCharge').map(allowanceCharge),
    properties: all(item, 'AdditionalItemProperty').map((p) => ({ name: text(p, 'Name'), value: text(p, 'Value') })),
    subLines: all(el, 'SubInvoiceLine|SubCreditNoteLine').map(line),
  };
}

function paymentMeans(el: Element, remittanceFallback: string): PaymentMeans {
  return {
    code: text(el, 'PaymentMeansCode'),
    text: attr(el, 'PaymentMeansCode', 'name'),
    remittance: text(el, 'PaymentID') || remittanceFallback,
    iban: text(el, 'PayeeFinancialAccount/ID'),
    accountName: text(el, 'PayeeFinancialAccount/Name'),
    bic: text(el, 'PayeeFinancialAccount/FinancialInstitutionBranch/ID'),
    card: text(el, 'CardAccount/PrimaryAccountNumberID'),
    mandate: text(el, 'PaymentMandate/ID'),
    debitedAccount: text(el, 'PaymentMandate/PayerFinancialAccount/ID'),
  };
}

function attachment(el: Element): Attachment {
  const bin = first(el, 'Attachment/EmbeddedDocumentBinaryObject');
  return {
    id: text(el, 'ID'),
    description: text(el, 'DocumentDescription'),
    filename: bin?.getAttribute('filename') ?? '',
    mimeCode: bin?.getAttribute('mimeCode') ?? '',
    base64: bin ? (bin.textContent ?? '').replace(/\s+/g, '') : '',
    uri: text(el, 'Attachment/ExternalReference/URI'),
  };
}

/** `root` is the Invoice or CreditNote element, which sits below the document element when the file carries a Peppol SBDH envelope. */
export function parseUbl(doc: Document, root: Element = doc.documentElement): Invoice {
  const isCreditNote = localName(root) === 'CreditNote';
  // The document-level TaxTotal with subtotals is in document currency; a second one may carry BT-111.
  const taxTotals = all(root, 'TaxTotal');
  const docCurrency = text(root, 'DocumentCurrencyCode');
  const mainTax =
    taxTotals.find((t) => attr(t, 'TaxAmount', 'currencyID') === docCurrency && all(t, 'TaxSubtotal').length > 0) ??
    taxTotals.find((t) => all(t, 'TaxSubtotal').length > 0) ??
    taxTotals[0] ??
    null;
  const lmt = first(root, 'LegalMonetaryTotal');
  const payee = first(root, 'PayeeParty');
  const taxRep = first(root, 'TaxRepresentativeParty');
  const delivery = first(root, 'Delivery');
  const deliveryAddr = first(delivery, 'DeliveryLocation/Address');

  return {
    syntax: 'UBL',
    isCreditNote,
    customizationId: text(root, 'CustomizationID'),
    profileId: text(root, 'ProfileID'),
    number: text(root, 'ID'),
    issueDate: text(root, 'IssueDate'),
    typeCode: text(root, isCreditNote ? 'CreditNoteTypeCode' : 'InvoiceTypeCode'),
    currency: docCurrency,
    taxCurrency: text(root, 'TaxCurrencyCode'),
    taxPointDate: text(root, 'TaxPointDate'),
    dueDate: text(root, 'DueDate') || text(root, 'PaymentMeans/PaymentDueDate'),
    buyerReference: text(root, 'BuyerReference'),
    projectRef: text(root, 'ProjectReference/ID'),
    contractRef: text(root, 'ContractDocumentReference/ID'),
    orderRef: text(root, 'OrderReference/ID'),
    salesOrderRef: text(root, 'OrderReference/SalesOrderID'),
    receivingAdviceRef: text(root, 'ReceiptDocumentReference/ID'),
    despatchAdviceRef: text(root, 'DespatchDocumentReference/ID'),
    accountingRef: text(root, 'AccountingCost'),
    paymentTerms: texts(root, 'PaymentTerms/Note').join('\n'),
    notes: texts(root, 'Note'),
    precedingInvoices: all(root, 'BillingReference/InvoiceDocumentReference').map((r) => ({
      number: text(r, 'ID'),
      date: text(r, 'IssueDate'),
    })),
    periodStart: text(root, 'InvoicePeriod/StartDate'),
    periodEnd: text(root, 'InvoicePeriod/EndDate'),
    seller: party(first(root, 'AccountingSupplierParty/Party')),
    buyer: party(first(root, 'AccountingCustomerParty/Party')),
    payee: payee
      ? {
          name: text(payee, 'PartyName/Name'),
          id: text(payee, 'PartyIdentification/ID'),
          legalId: text(payee, 'PartyLegalEntity/CompanyID'),
        }
      : null,
    taxRepresentative: taxRep
      ? { name: text(taxRep, 'PartyName/Name'), vatId: text(taxRep, 'PartyTaxScheme/CompanyID') }
      : null,
    delivery: {
      name: text(delivery, 'DeliveryParty/PartyName/Name'),
      date: text(delivery, 'ActualDeliveryDate'),
      locationId: text(delivery, 'DeliveryLocation/ID'),
      address: deliveryAddr ? address(deliveryAddr) : null,
    },
    paymentMeans: all(root, 'PaymentMeans').map((pm) => paymentMeans(pm, '')),
    allowancesCharges: all(root, 'AllowanceCharge').map(allowanceCharge),
    vat: all(mainTax, 'TaxSubtotal').map((s) => ({
      category: text(s, 'TaxCategory/ID'),
      rate: text(s, 'TaxCategory/Percent'),
      taxable: text(s, 'TaxableAmount'),
      tax: text(s, 'TaxAmount'),
      exemptionReason: text(s, 'TaxCategory/TaxExemptionReason'),
      exemptionCode: text(s, 'TaxCategory/TaxExemptionReasonCode'),
    })),
    totals: {
      lineTotal: text(lmt, 'LineExtensionAmount'),
      allowanceTotal: text(lmt, 'AllowanceTotalAmount'),
      chargeTotal: text(lmt, 'ChargeTotalAmount'),
      taxExclusive: text(lmt, 'TaxExclusiveAmount'),
      taxTotal: text(mainTax, 'TaxAmount'),
      taxInclusive: text(lmt, 'TaxInclusiveAmount'),
      prepaid: text(lmt, 'PrepaidAmount'),
      rounding: text(lmt, 'PayableRoundingAmount'),
      payable: text(lmt, 'PayableAmount'),
    },
    lines: all(root, 'InvoiceLine|CreditNoteLine').map(line),
    attachments: all(root, 'AdditionalDocumentReference').map(attachment),
  };
}
