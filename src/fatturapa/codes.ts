/*
 * Code lists from the FatturaPA technical specification (Allegato A,
 * "Specifiche tecniche" 1.9 / 1.9.1). Italian is the authoritative wording; English
 * is ours.
 */
type L = Record<string, { it: string; en: string }>;

export const TIPO_DOCUMENTO: L = {
  TD01: { it: 'Fattura', en: 'Invoice' },
  TD02: { it: 'Acconto/anticipo su fattura', en: 'Advance payment on invoice' },
  TD03: { it: 'Acconto/anticipo su parcella', en: 'Advance payment on fee note' },
  TD04: { it: 'Nota di credito', en: 'Credit note' },
  TD05: { it: 'Nota di debito', en: 'Debit note' },
  TD06: { it: 'Parcella', en: 'Fee note' },
  TD07: { it: 'Fattura semplificata', en: 'Simplified invoice' },
  TD08: { it: 'Nota di credito semplificata', en: 'Simplified credit note' },
  TD09: { it: 'Nota di debito semplificata', en: 'Simplified debit note' },
  TD16: { it: 'Integrazione fattura reverse charge interno', en: 'Domestic reverse charge integration' },
  TD17: { it: "Integrazione/autofattura per acquisto servizi dall'estero", en: 'Self-invoice for services purchased abroad' },
  TD18: { it: 'Integrazione per acquisto di beni intracomunitari', en: 'Integration for intra-EU purchase of goods' },
  TD19: { it: 'Integrazione/autofattura per acquisto di beni ex art.17 c.2 DPR 633/72', en: 'Self-invoice for goods (art. 17(2) DPR 633/72)' },
  TD20: { it: 'Autofattura per regolarizzazione e integrazione delle fatture', en: 'Self-invoice to regularise invoices' },
  TD21: { it: 'Autofattura per splafonamento', en: 'Self-invoice for exceeding the export ceiling' },
  TD22: { it: 'Estrazione beni da Deposito IVA', en: 'Goods removed from VAT warehouse' },
  TD23: { it: 'Estrazione beni da Deposito IVA con versamento dell’IVA', en: 'Goods removed from VAT warehouse with VAT payment' },
  TD24: { it: 'Fattura differita di cui all’art. 21, comma 4, lett. a)', en: 'Deferred invoice (art. 21(4)(a))' },
  TD25: { it: 'Fattura differita di cui all’art. 21, comma 4, terzo periodo lett. b)', en: 'Deferred invoice (art. 21(4)(b))' },
  TD26: { it: 'Cessione di beni ammortizzabili e per passaggi interni', en: 'Sale of depreciable assets / internal transfers' },
  TD27: { it: 'Fattura per autoconsumo o per cessioni gratuite senza rivalsa', en: 'Invoice for self-consumption or free supplies' },
  TD28: { it: 'Acquisti da San Marino con IVA (fattura cartacea)', en: 'Purchases from San Marino with VAT (paper invoice)' },
  TD29: { it: 'Comunicazione per omessa o irregolare fatturazione', en: 'Report of missing or irregular invoice' },
};

export const MODALITA_PAGAMENTO: L = {
  MP01: { it: 'Contanti', en: 'Cash' },
  MP02: { it: 'Assegno', en: 'Cheque' },
  MP03: { it: 'Assegno circolare', en: "Banker's draft" },
  MP04: { it: 'Contanti presso Tesoreria', en: 'Cash at treasury' },
  MP05: { it: 'Bonifico', en: 'Bank transfer' },
  MP06: { it: 'Vaglia cambiario', en: 'Promissory note' },
  MP07: { it: 'Bollettino bancario', en: 'Bank payment slip' },
  MP08: { it: 'Carta di pagamento', en: 'Payment card' },
  MP09: { it: 'RID', en: 'Direct debit (RID)' },
  MP10: { it: 'RID utenze', en: 'Utility direct debit' },
  MP11: { it: 'RID veloce', en: 'Fast direct debit' },
  MP12: { it: 'RIBA', en: 'Bank receipt (RIBA)' },
  MP13: { it: 'MAV', en: 'Payment notice (MAV)' },
  MP14: { it: 'Quietanza erario', en: 'Tax office receipt' },
  MP15: { it: 'Giroconto su conti di contabilità speciale', en: 'Transfer to special accounting account' },
  MP16: { it: 'Domiciliazione bancaria', en: 'Bank direct debit' },
  MP17: { it: 'Domiciliazione postale', en: 'Postal direct debit' },
  MP18: { it: 'Bollettino di c/c postale', en: 'Postal giro slip' },
  MP19: { it: 'SEPA Direct Debit', en: 'SEPA direct debit' },
  MP20: { it: 'SEPA Direct Debit CORE', en: 'SEPA direct debit CORE' },
  MP21: { it: 'SEPA Direct Debit B2B', en: 'SEPA direct debit B2B' },
  MP22: { it: 'Trattenuta su somme già riscosse', en: 'Deduction from sums already collected' },
  MP23: { it: 'PagoPA', en: 'PagoPA' },
};

export const CONDIZIONI_PAGAMENTO: L = {
  TP01: { it: 'Pagamento a rate', en: 'Payment in instalments' },
  TP02: { it: 'Pagamento completo', en: 'Full payment' },
  TP03: { it: 'Anticipo', en: 'Advance payment' },
};

export const NATURA: L = {
  N1: { it: 'Escluse ex art. 15 DPR 633/72', en: 'Excluded (art. 15 DPR 633/72)' },
  N2: { it: 'Non soggette', en: 'Not subject to VAT' },
  'N2.1': { it: 'Non soggette ad IVA ai sensi degli artt. da 7 a 7-septies del DPR 633/72', en: 'Not subject (arts. 7–7-septies DPR 633/72)' },
  'N2.2': { it: 'Non soggette – altri casi', en: 'Not subject – other cases' },
  N3: { it: 'Non imponibili', en: 'Not taxable' },
  'N3.1': { it: 'Non imponibili – esportazioni', en: 'Not taxable – exports' },
  'N3.2': { it: 'Non imponibili – cessioni intracomunitarie', en: 'Not taxable – intra-EU supplies' },
  'N3.3': { it: 'Non imponibili – cessioni verso San Marino', en: 'Not taxable – supplies to San Marino' },
  'N3.4': { it: "Non imponibili – operazioni assimilate alle cessioni all'esportazione", en: 'Not taxable – treated as exports' },
  'N3.5': { it: "Non imponibili – a seguito di dichiarazioni d'intento", en: 'Not taxable – declaration of intent' },
  'N3.6': { it: 'Non imponibili – altre operazioni che non concorrono alla formazione del plafond', en: 'Not taxable – other' },
  N4: { it: 'Esenti', en: 'Exempt' },
  N5: { it: 'Regime del margine / IVA non esposta in fattura', en: 'Margin scheme / VAT not shown' },
  N6: { it: 'Inversione contabile', en: 'Reverse charge' },
  'N6.1': { it: 'Inversione contabile – cessione di rottami e altri materiali di recupero', en: 'Reverse charge – scrap' },
  'N6.2': { it: 'Inversione contabile – cessione di oro e argento', en: 'Reverse charge – gold and silver' },
  'N6.3': { it: 'Inversione contabile – subappalto nel settore edile', en: 'Reverse charge – construction subcontracting' },
  'N6.4': { it: 'Inversione contabile – cessione di fabbricati', en: 'Reverse charge – buildings' },
  'N6.5': { it: 'Inversione contabile – cessione di telefoni cellulari', en: 'Reverse charge – mobile phones' },
  'N6.6': { it: 'Inversione contabile – cessione di prodotti elettronici', en: 'Reverse charge – electronics' },
  'N6.7': { it: 'Inversione contabile – prestazioni comparto edile e settori connessi', en: 'Reverse charge – construction services' },
  'N6.8': { it: 'Inversione contabile – operazioni settore energetico', en: 'Reverse charge – energy sector' },
  'N6.9': { it: 'Inversione contabile – altri casi', en: 'Reverse charge – other' },
  N7: { it: 'IVA assolta in altro stato UE', en: 'VAT paid in another EU state' },
};

export const REGIME_FISCALE: L = {
  RF01: { it: 'Ordinario', en: 'Ordinary' },
  RF02: { it: 'Contribuenti minimi', en: 'Minimum taxpayers' },
  RF04: { it: 'Agricoltura e attività connesse e pesca', en: 'Agriculture and fishing' },
  RF05: { it: 'Vendita sali e tabacchi', en: 'Salt and tobacco sales' },
  RF06: { it: 'Commercio fiammiferi', en: 'Match trade' },
  RF07: { it: 'Editoria', en: 'Publishing' },
  RF08: { it: 'Gestione servizi telefonia pubblica', en: 'Public telephony' },
  RF09: { it: 'Rivendita documenti di trasporto pubblico e di sosta', en: 'Resale of transport and parking tickets' },
  RF10: { it: 'Intrattenimenti, giochi e altre attività', en: 'Entertainment and gaming' },
  RF11: { it: 'Agenzie viaggi e turismo', en: 'Travel agencies' },
  RF12: { it: 'Agriturismo', en: 'Agritourism' },
  RF13: { it: 'Vendite a domicilio', en: 'Door-to-door sales' },
  RF14: { it: 'Rivendita beni usati, oggetti d’arte, d’antiquariato o da collezione', en: 'Second-hand goods, art, antiques' },
  RF15: { it: 'Agenzie di vendite all’asta', en: 'Auction houses' },
  RF16: { it: 'IVA per cassa P.A.', en: 'Cash accounting (public administration)' },
  RF17: { it: 'IVA per cassa', en: 'Cash accounting' },
  RF18: { it: 'Altro', en: 'Other' },
  RF19: { it: 'Regime forfettario', en: 'Flat-rate scheme' },
  RF20: { it: 'Regime transfrontaliero di franchigia IVA', en: 'Cross-border VAT exemption scheme' },
};

export const ESIGIBILITA_IVA: L = {
  I: { it: 'Immediata', en: 'Immediate' },
  D: { it: 'Differita', en: 'Deferred' },
  S: { it: 'Scissione dei pagamenti', en: 'Split payment' },
};

export const TIPO_RITENUTA: L = {
  RT01: { it: 'Ritenuta persone fisiche', en: 'Withholding – individuals' },
  RT02: { it: 'Ritenuta persone giuridiche', en: 'Withholding – companies' },
  RT03: { it: 'Contributo INPS', en: 'INPS contribution' },
  RT04: { it: 'Contributo ENASARCO', en: 'ENASARCO contribution' },
  RT05: { it: 'Contributo ENPAM', en: 'ENPAM contribution' },
  RT06: { it: 'Altro contributo previdenziale', en: 'Other social security contribution' },
};

export const TIPO_CASSA: L = {
  TC01: { it: 'Cassa nazionale previdenza e assistenza avvocati e procuratori legali', en: 'Lawyers’ pension fund' },
  TC02: { it: 'Cassa previdenza dottori commercialisti', en: 'Accountants’ pension fund' },
  TC03: { it: 'Cassa previdenza e assistenza geometri', en: 'Surveyors’ pension fund' },
  TC04: { it: 'Cassa nazionale previdenza e assistenza ingegneri e architetti liberi professionisti', en: 'Engineers and architects’ pension fund' },
  TC05: { it: 'Cassa nazionale del notariato', en: 'Notaries’ fund' },
  TC06: { it: 'Cassa nazionale previdenza e assistenza ragionieri e periti commerciali', en: 'Bookkeepers’ pension fund' },
  TC22: { it: 'INPS', en: 'INPS' },
};

export function fpLabel(list: L, code: string, lang: 'it' | 'en'): string {
  return list[code]?.[lang] ?? '';
}
