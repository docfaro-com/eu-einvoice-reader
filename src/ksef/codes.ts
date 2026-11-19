/*
 * Labels for the FA(3) code lists. The Polish wording follows the Ministry of
 * Finance brochure and its PDF generator so readers see the official terms.
 */
export type KsefLang = 'pl' | 'en';
type Labels = Record<string, Record<KsefLang, string>>;

export const RODZAJ: Labels = {
  VAT: { pl: 'Faktura', en: 'Invoice' },
  KOR: { pl: 'Faktura korygująca', en: 'Corrective invoice' },
  ZAL: { pl: 'Faktura zaliczkowa', en: 'Advance payment invoice' },
  ROZ: { pl: 'Faktura rozliczeniowa', en: 'Settlement invoice' },
  UPR: { pl: 'Faktura uproszczona', en: 'Simplified invoice' },
  KOR_ZAL: { pl: 'Faktura korygująca fakturę zaliczkową', en: 'Correction of an advance payment invoice' },
  KOR_ROZ: { pl: 'Faktura korygująca fakturę rozliczeniową', en: 'Correction of a settlement invoice' },
};

/** Full legal description of RodzajFaktury, shown as a subtitle. */
export const RODZAJ_OPIS: Labels = {
  VAT: { pl: 'Faktura podstawowa', en: 'Standard invoice' },
  KOR: { pl: 'Faktura korygująca', en: 'Corrective invoice' },
  ZAL: { pl: 'Faktura dokumentująca otrzymanie zapłaty lub jej części przed dokonaniem czynności', en: 'Invoice documenting payment received before the supply' },
  ROZ: { pl: 'Faktura wystawiona w związku z art. 106f ust. 3 ustawy (rozliczenie zaliczek)', en: 'Final invoice settling earlier advance payments (art. 106f(3) VAT Act)' },
  UPR: { pl: 'Faktura, o której mowa w art. 106e ust. 5 pkt 3 ustawy (do 450 zł lub 100 euro)', en: 'Simplified invoice under art. 106e(5)(3) VAT Act (up to PLN 450 or EUR 100)' },
  KOR_ZAL: { pl: 'Korekta faktury zaliczkowej', en: 'Correction of an advance payment invoice' },
  KOR_ROZ: { pl: 'Korekta faktury rozliczeniowej', en: 'Correction of a settlement invoice' },
};

export const FORMA_PLATNOSCI: Labels = {
  '1': { pl: 'Gotówka', en: 'Cash' },
  '2': { pl: 'Karta', en: 'Card' },
  '3': { pl: 'Bon', en: 'Voucher' },
  '4': { pl: 'Czek', en: 'Cheque' },
  '5': { pl: 'Kredyt', en: 'Credit' },
  '6': { pl: 'Przelew', en: 'Bank transfer' },
  '7': { pl: 'Płatność mobilna', en: 'Mobile payment' },
};

export const TYP_KOREKTY: Labels = {
  '1': { pl: 'Korekta skutkująca w dacie ujęcia faktury pierwotnej', en: 'Takes effect on the date the original invoice was recorded' },
  '2': { pl: 'Korekta skutkująca w dacie wystawienia faktury korygującej', en: 'Takes effect on the date of the corrective invoice' },
  '3': { pl: 'Korekta skutkująca w dacie innej', en: 'Takes effect on another date' },
};

export const ROLA_PODMIOTU3: Labels = {
  '1': { pl: 'Faktor', en: 'Factor' },
  '2': { pl: 'Odbiorca', en: 'Recipient (unit or branch of the buyer)' },
  '3': { pl: 'Podmiot pierwotny', en: 'Original entity (acquired or transformed)' },
  '4': { pl: 'Dodatkowy nabywca', en: 'Additional buyer' },
  '5': { pl: 'Wystawca faktury', en: 'Issuer on behalf of the seller' },
  '6': { pl: 'Dokonujący płatności', en: 'Payer' },
  '7': { pl: 'Jednostka samorządu terytorialnego – wystawca', en: 'Local government unit – issuer' },
  '8': { pl: 'Jednostka samorządu terytorialnego – odbiorca', en: 'Local government unit – recipient' },
  '9': { pl: 'Członek grupy VAT – wystawca', en: 'VAT group member – issuer' },
  '10': { pl: 'Członek grupy VAT – odbiorca', en: 'VAT group member – recipient' },
  '11': { pl: 'Pracownik', en: 'Employee' },
};

export const ROLA_UPOWAZNIONEGO: Labels = {
  '1': { pl: 'Organ egzekucyjny', en: 'Enforcement authority' },
  '2': { pl: 'Komornik sądowy', en: 'Court bailiff' },
  '3': { pl: 'Przedstawiciel podatkowy', en: 'Tax representative' },
};

export const STATUS_PODATNIKA: Labels = {
  '1': { pl: 'Stan likwidacji', en: 'In liquidation' },
  '2': { pl: 'Postępowanie restrukturyzacyjne', en: 'Restructuring proceedings' },
  '3': { pl: 'Stan upadłości', en: 'Bankruptcy' },
  '4': { pl: 'Przedsiębiorstwo w spadku', en: 'Business in probate' },
};

/** P_12 values that are not a plain percentage. */
export const STAWKA: Labels = {
  '0 KR': { pl: '0% (kraj)', en: '0% (domestic)' },
  '0 WDT': { pl: '0% WDT', en: '0% intra-EU supply' },
  '0 EX': { pl: '0% eksport', en: '0% export' },
  '0': { pl: '0%', en: '0%' },
  zw: { pl: 'zw', en: 'exempt' },
  oo: { pl: 'oo', en: 'reverse charge' },
  'np I': { pl: 'np I', en: 'outside Poland' },
  'np II': { pl: 'np II', en: 'art. 100(1)(4) services' },
  np: { pl: 'np', en: 'outside scope' },
};

/** Rows of the VAT summary, keyed by the suffix of P_13_x / P_14_x. */
export const VAT_ROW: Labels = {
  '1': { pl: 'Stawka podstawowa (23% lub 22%)', en: 'Standard rate (23% or 22%)' },
  '2': { pl: 'Stawka obniżona pierwsza (8% lub 7%)', en: 'First reduced rate (8% or 7%)' },
  '3': { pl: 'Stawka obniżona druga (5%)', en: 'Second reduced rate (5%)' },
  '4': { pl: 'Ryczałt dla taksówek osobowych (4% lub 3%)', en: 'Flat rate for taxis (4% or 3%)' },
  '5': { pl: 'Procedura szczególna OSS (dział XII rozdział 6a)', en: 'OSS special procedure' },
  '6_1': { pl: '0% – sprzedaż krajowa', en: '0% – domestic supplies' },
  '6_2': { pl: '0% – wewnątrzwspólnotowa dostawa towarów', en: '0% – intra-EU supply of goods' },
  '6_3': { pl: '0% – eksport towarów', en: '0% – export of goods' },
  '7': { pl: 'Zwolnione od podatku', en: 'Exempt from VAT' },
  '8': { pl: 'Dostawy i usługi poza terytorium kraju', en: 'Supplies taxed outside Poland' },
  '9': { pl: 'Usługi z art. 100 ust. 1 pkt 4 ustawy', en: 'Services under art. 100(1)(4) VAT Act' },
  '10': { pl: 'Odwrotne obciążenie (sprzedaż krajowa)', en: 'Domestic reverse charge' },
  '11': { pl: 'Procedura marży', en: 'Margin scheme' },
};

/** Which P_13_x row a line with this P_12 value belongs to. */
export function vatRowForRate(rate: string, ossRate = ''): string {
  if (ossRate) return '5';
  switch (rate.trim()) {
    case '23':
    case '22':
      return '1';
    case '8':
    case '7':
      return '2';
    case '5':
      return '3';
    case '4':
    case '3':
      return '4';
    case '0 KR':
    case '0':
      return '6_1';
    case '0 WDT':
      return '6_2';
    case '0 EX':
      return '6_3';
    case 'zw':
      return '7';
    case 'np I':
    case 'np':
      return '8';
    case 'np II':
      return '9';
    case 'oo':
      return '10';
    default:
      return '';
  }
}

export function ksefLabel(list: Labels, code: string, lang: KsefLang): string {
  return list[code]?.[lang] ?? '';
}
