/**
 * A syntax-neutral view of an EN 16931 invoice. Field comments carry the
 * business term (BT/BG) so renderers and checks can cite the standard.
 * Amounts stay strings exactly as written in the XML; formatting and
 * arithmetic happen at the edges so nothing is lost to float rounding on read.
 */

export type Syntax = 'UBL' | 'CII' | 'CII-ZUGFeRD1';

export interface Address {
  lines: string[]; // BT-35, BT-36, BT-162
  city: string; // BT-37
  postcode: string; // BT-38
  subdivision: string; // BT-39
  country: string; // BT-40
}

export interface Party {
  name: string; // BT-27 / BT-44 legal name
  tradingName: string; // BT-28 / BT-45
  ids: { value: string; scheme: string }[]; // BT-29 / BT-46
  legalId: string; // BT-30 / BT-47
  vatId: string; // BT-31 / BT-48
  taxNumber: string; // BT-32 (seller only)
  legalInfo: string; // BT-33
  endpoint: { value: string; scheme: string } | null; // BT-34 / BT-49
  address: Address;
  contact: { name: string; phone: string; email: string };
}

export interface PaymentMeans {
  code: string; // BT-81
  text: string; // BT-82
  remittance: string; // BT-83
  iban: string; // BT-84
  accountName: string; // BT-85
  bic: string; // BT-86
  card: string; // BT-87
  mandate: string; // BT-89
  debitedAccount: string; // BT-91
}

export interface AllowanceCharge {
  isCharge: boolean;
  amount: string;
  base: string;
  percent: string;
  reason: string;
  reasonCode: string;
  vatCategory: string;
  vatRate: string;
}

export interface VatBreakdown {
  category: string; // BT-118
  rate: string; // BT-119
  taxable: string; // BT-116
  tax: string; // BT-117
  exemptionReason: string; // BT-120
  exemptionCode: string; // BT-121
}

export interface Line {
  id: string; // BT-126
  note: string; // BT-127
  name: string; // BT-153
  description: string; // BT-154
  sellerItemId: string; // BT-155
  buyerItemId: string; // BT-156
  standardItemId: string; // BT-157
  quantity: string; // BT-129
  unit: string; // BT-130
  netPrice: string; // BT-146
  priceBaseQty: string; // BT-149
  grossPrice: string; // BT-148
  amount: string; // BT-131
  vatCategory: string; // BT-151
  vatRate: string; // BT-152
  periodStart: string;
  periodEnd: string;
  orderLineRef: string; // BT-132
  allowancesCharges: AllowanceCharge[];
  properties: { name: string; value: string }[];
  subLines: Line[];
}

export interface Attachment {
  id: string;
  description: string;
  filename: string;
  mimeCode: string;
  base64: string;
  uri: string;
}

export interface Totals {
  lineTotal: string; // BT-106
  allowanceTotal: string; // BT-107
  chargeTotal: string; // BT-108
  taxExclusive: string; // BT-109
  taxTotal: string; // BT-110
  taxInclusive: string; // BT-112
  prepaid: string; // BT-113
  rounding: string; // BT-114
  payable: string; // BT-115
}

export interface Invoice {
  syntax: Syntax;
  isCreditNote: boolean;
  customizationId: string; // BT-24
  profileId: string; // BT-23
  number: string; // BT-1
  issueDate: string; // BT-2 (ISO yyyy-mm-dd when parseable)
  typeCode: string; // BT-3
  currency: string; // BT-5
  taxCurrency: string; // BT-6
  taxPointDate: string; // BT-7
  dueDate: string; // BT-9
  buyerReference: string; // BT-10 (Leitweg-ID in German B2G)
  projectRef: string; // BT-11
  contractRef: string; // BT-12
  orderRef: string; // BT-13
  salesOrderRef: string; // BT-14
  receivingAdviceRef: string; // BT-15
  despatchAdviceRef: string; // BT-16
  accountingRef: string; // BT-19
  paymentTerms: string; // BT-20
  notes: string[]; // BT-22
  precedingInvoices: { number: string; date: string }[]; // BG-3
  periodStart: string; // BT-73
  periodEnd: string; // BT-74
  seller: Party;
  buyer: Party;
  payee: { name: string; id: string; legalId: string } | null; // BG-10
  taxRepresentative: { name: string; vatId: string } | null; // BG-11
  delivery: { name: string; date: string; locationId: string; address: Address | null };
  paymentMeans: PaymentMeans[];
  allowancesCharges: AllowanceCharge[];
  vat: VatBreakdown[];
  totals: Totals;
  lines: Line[];
  attachments: Attachment[];
}

export function emptyAddress(): Address {
  return { lines: [], city: '', postcode: '', subdivision: '', country: '' };
}
