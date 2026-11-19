/*
 * Human labels for the code lists EN 16931 uses most often. Unknown codes are
 * shown verbatim by the renderer, so these lists only need the common cases.
 */
export type Lang = 'de' | 'en' | 'it' | 'pl' | 'nl' | 'fr' | 'fr-FR' | 'es';
// Only the languages of tools that show these code lists carry labels; others fall back to English, fr-FR to fr first.
type Labels = Record<string, Partial<Record<Lang, string>> & Record<'en', string>>;

/** UNTDID 1001 (BT-3) */
export const INVOICE_TYPES: Labels = {
  '380': { de: 'Rechnung', en: 'Commercial invoice', it: 'Fattura', nl: 'Factuur', fr: 'Facture' },
  '381': { de: 'Gutschrift', en: 'Credit note', it: 'Nota di credito', nl: 'Creditnota', fr: 'Note de crédit', 'fr-FR': 'Avoir' },
  '383': { de: 'Belastungsanzeige', en: 'Debit note', it: 'Nota di debito', nl: 'Debetnota', fr: 'Note de débit' },
  '384': { de: 'Rechnungskorrektur', en: 'Corrected invoice', it: 'Fattura rettificativa', nl: 'Verbeterde factuur', fr: 'Facture rectificative' },
  '386': { de: 'Vorauszahlungsrechnung', en: 'Prepayment invoice', it: 'Fattura di acconto', nl: 'Voorschotfactuur', fr: 'Facture d’acompte' },
  '389': { de: 'Gutschrift (Selbstfakturierung)', en: 'Self-billed invoice', it: 'Autofattura', nl: 'Factuur (zelffacturatie)', fr: 'Autofacture' },
  '326': { de: 'Teilrechnung', en: 'Partial invoice', it: 'Fattura parziale', nl: 'Deelfactuur', fr: 'Facture partielle' },
  '875': { de: 'Teilschlussrechnung (Bau)', en: 'Partial construction invoice', it: 'Fattura parziale (costruzioni)', nl: 'Deelfactuur bouw', fr: 'Facture partielle (construction)' },
  '876': { de: 'Abschlagsrechnung (Bau)', en: 'Partial final construction invoice', it: 'Fattura di acconto (costruzioni)', nl: 'Voorlopige eindfactuur bouw', fr: 'Facture finale partielle (construction)' },
  '877': { de: 'Schlussrechnung (Bau)', en: 'Final construction invoice', it: 'Fattura finale (costruzioni)', nl: 'Eindfactuur bouw', fr: 'Facture finale (construction)' },
  '261': { de: 'Selbstfakturierte Gutschrift', en: 'Self-billed credit note', it: 'Nota di credito autofatturata', nl: 'Creditnota (zelffacturatie)', fr: 'Note de crédit autofacturée', 'fr-FR': 'Avoir autofacturé' },
  '751': { de: 'Rechnungsinformation (nur Buchhaltung)', en: 'Invoice information for accounting', it: 'Informazioni fattura', nl: 'Factuurinformatie (alleen boekhouding)', fr: 'Informations de facture (comptabilité)' },
};

/** UNTDID 4461 (BT-81) */
export const PAYMENT_MEANS: Labels = {
  '1': { de: 'Nicht definiert', en: 'Not defined', it: 'Non definito', nl: 'Niet bepaald', fr: 'Non défini' },
  '10': { de: 'Bar', en: 'Cash', it: 'Contanti', nl: 'Contant', fr: 'Espèces' },
  '20': { de: 'Scheck', en: 'Cheque', it: 'Assegno', nl: 'Cheque', fr: 'Chèque' },
  '30': { de: 'Überweisung', en: 'Credit transfer', it: 'Bonifico', nl: 'Overschrijving', fr: 'Virement' },
  '31': { de: 'Überweisung (Debit transfer)', en: 'Debit transfer', it: 'Trasferimento a debito', nl: 'Debetoverschrijving', fr: 'Virement de débit' },
  '42': { de: 'Zahlung auf Bankkonto', en: 'Payment to bank account', it: 'Pagamento su conto bancario', nl: 'Betaling op bankrekening', fr: 'Paiement sur compte bancaire' },
  '48': { de: 'Bankkarte', en: 'Bank card', it: 'Carta bancaria', nl: 'Bankkaart', fr: 'Carte bancaire' },
  '49': { de: 'Lastschrift', en: 'Direct debit', it: 'Addebito diretto', nl: 'Domiciliëring', fr: 'Domiciliation', 'fr-FR': 'Prélèvement' },
  '54': { de: 'Kreditkarte', en: 'Credit card', it: 'Carta di credito', nl: 'Kredietkaart', fr: 'Carte de crédit' },
  '55': { de: 'Debitkarte', en: 'Debit card', it: 'Carta di debito', nl: 'Debetkaart', fr: 'Carte de débit' },
  '57': { de: 'Dauerauftrag', en: 'Standing agreement', it: 'Ordine permanente', nl: 'Doorlopende opdracht', fr: 'Ordre permanent' },
  '58': { de: 'SEPA-Überweisung', en: 'SEPA credit transfer', it: 'Bonifico SEPA', nl: 'SEPA-overschrijving', fr: 'Virement SEPA' },
  '59': { de: 'SEPA-Lastschrift', en: 'SEPA direct debit', it: 'Addebito diretto SEPA', nl: 'SEPA-domiciliëring', fr: 'Domiciliation SEPA', 'fr-FR': 'Prélèvement SEPA' },
  '68': { de: 'Online-Zahlungsdienst', en: 'Online payment service', it: 'Servizio di pagamento online', nl: 'Online betaaldienst', fr: 'Service de paiement en ligne' },
  '97': { de: 'Verrechnung', en: 'Clearing between partners', it: 'Compensazione', nl: 'Verrekening', fr: 'Compensation' },
  ZZZ: { de: 'Vereinbart', en: 'Mutually defined', it: 'Concordato', nl: 'Onderling overeengekomen', fr: 'Convenu entre les parties' },
};

/** UNCL 5305 (BT-118 / BT-151) */
export const VAT_CATEGORIES: Labels = {
  S: { de: 'Normalsatz', en: 'Standard rate', it: 'Aliquota ordinaria', nl: 'Normaal tarief', fr: 'Taux normal' },
  Z: { de: 'Nullsatz', en: 'Zero rated', it: 'Aliquota zero', nl: 'Nultarief', fr: 'Taux zéro' },
  E: { de: 'Steuerbefreit', en: 'Exempt', it: 'Esente', nl: 'Vrijgesteld', fr: 'Exempté' },
  AE: { de: 'Reverse Charge', en: 'Reverse charge', it: 'Inversione contabile', nl: 'Verlegging van heffing', fr: 'Autoliquidation' },
  K: { de: 'Innergemeinschaftliche Lieferung', en: 'Intra-community supply', it: 'Cessione intracomunitaria', nl: 'Intracommunautaire levering', fr: 'Livraison intracommunautaire' },
  G: { de: 'Ausfuhr (Drittland)', en: 'Export outside the EU', it: 'Esportazione extra UE', nl: 'Uitvoer buiten de EU', fr: 'Exportation hors UE' },
  O: { de: 'Nicht steuerbar', en: 'Not subject to VAT', it: 'Fuori campo IVA', nl: 'Niet onderworpen aan btw', fr: 'Hors champ de la TVA' },
  L: { de: 'IGIC (Kanaren)', en: 'Canary Islands IGIC', it: 'IGIC (Canarie)', nl: 'IGIC (Canarische Eilanden)', fr: 'IGIC (Canaries)' },
  M: { de: 'IPSI (Ceuta/Melilla)', en: 'Ceuta/Melilla IPSI', it: 'IPSI (Ceuta/Melilla)', nl: 'IPSI (Ceuta/Melilla)', fr: 'IPSI (Ceuta/Melilla)' },
};

/** UN/ECE Rec. 20 + Rec. 21, the units that occur in practice. */
export const UNITS: Labels = {
  C62: { de: 'Stk.', en: 'pcs', it: 'pz', nl: 'st.', fr: 'pce' },
  H87: { de: 'Stk.', en: 'pcs', it: 'pz', nl: 'st.', fr: 'pce' },
  EA: { de: 'Stk.', en: 'each', it: 'pz', nl: 'st.', fr: 'pce' },
  XPP: { de: 'Stk.', en: 'pcs', it: 'pz', nl: 'st.', fr: 'pce' },
  HUR: { de: 'Std.', en: 'h', it: 'ore', nl: 'u', fr: 'h' },
  MIN: { de: 'Min.', en: 'min', it: 'min', nl: 'min', fr: 'min' },
  DAY: { de: 'Tag(e)', en: 'day(s)', it: 'giorni', nl: 'dag(en)', fr: 'jour(s)' },
  WEE: { de: 'Woche(n)', en: 'week(s)', it: 'settimane', nl: 'week/weken', fr: 'semaine(s)' },
  MON: { de: 'Monat(e)', en: 'month(s)', it: 'mesi', nl: 'maand(en)', fr: 'mois' },
  ANN: { de: 'Jahr(e)', en: 'year(s)', it: 'anni', nl: 'jaar', fr: 'an(s)' },
  KGM: { de: 'kg', en: 'kg', it: 'kg', nl: 'kg', fr: 'kg' },
  GRM: { de: 'g', en: 'g', it: 'g', nl: 'g', fr: 'g' },
  TNE: { de: 't', en: 't', it: 't', nl: 't', fr: 't' },
  MTR: { de: 'm', en: 'm', it: 'm', nl: 'm', fr: 'm' },
  KTM: { de: 'km', en: 'km', it: 'km', nl: 'km', fr: 'km' },
  MTK: { de: 'm²', en: 'm²', it: 'm²', nl: 'm²', fr: 'm²' },
  MTQ: { de: 'm³', en: 'm³', it: 'm³', nl: 'm³', fr: 'm³' },
  LTR: { de: 'l', en: 'l', it: 'l', nl: 'l', fr: 'l' },
  KWH: { de: 'kWh', en: 'kWh', it: 'kWh', nl: 'kWh', fr: 'kWh' },
  LS: { de: 'pauschal', en: 'lump sum', it: 'forfait', nl: 'forfait', fr: 'forfait' },
  SET: { de: 'Satz', en: 'set', it: 'set', nl: 'set', fr: 'ensemble' },
  P1: { de: '%', en: '%', it: '%', nl: '%', fr: '%' },
  XBX: { de: 'Karton', en: 'box', it: 'scatola', nl: 'doos', fr: 'boîte' },
  XPK: { de: 'Paket', en: 'package', it: 'confezione', nl: 'pak', fr: 'colis' },
  XPX: { de: 'Palette', en: 'pallet', it: 'pallet', nl: 'pallet', fr: 'palette' },
  PR: { de: 'Paar', en: 'pair', it: 'paio', nl: 'paar', fr: 'paire' },
  E48: { de: 'Leistung', en: 'service unit', it: 'servizio', nl: 'dienst', fr: 'service' },
};

export function label(list: Labels, code: string, lang: Lang): string {
  const entry = list[code];
  return entry ? (entry[lang] ?? (lang === 'fr-FR' ? entry.fr : undefined) ?? entry.en) : '';
}
