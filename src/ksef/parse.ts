import { all, attr, elementChildren, first, localName, parseXml, rootName, text, texts, type XmlParser } from '../xml.ts';

/*
 * Reads a Polish KSeF e-invoice (logical structure FA(3), and the older FA(2)
 * that KSeF accepted until 31 January 2026) into a flat model. Element names
 * follow the Ministry of Finance schema; FA(2) and FA(3) share almost all of
 * them, so one reader covers both. Amounts stay strings as written.
 */

export type KsefVariant = 'FA (3)' | 'FA (2)';

export interface KsefAddress {
  country: string;
  line1: string;
  line2: string;
  gln: string;
}

export interface KsefParty {
  nip: string;
  /** Internal ID of a VAT group member or unit (IDWew, Podmiot3 only). */
  internalId: string;
  euCode: string;
  euVat: string;
  countryCode: string;
  otherId: string;
  noId: boolean;
  name: string;
  prefix: string;
  eori: string;
  address: KsefAddress | null;
  correspondence: KsefAddress | null;
  contacts: { email: string; phone: string }[];
  customerNo: string;
  buyerId: string;
  jst: string;
  gv: string;
  role: string;
  roleOther: string;
  roleDescription: string;
  share: string;
  status: string;
}

export interface KsefLine {
  no: string;
  date: string; // P_6A
  name: string; // P_7
  index: string;
  gtin: string;
  pkwiu: string;
  cn: string;
  pkob: string;
  unit: string; // P_8A
  qty: string; // P_8B
  unitNet: string; // P_9A
  unitGross: string; // P_9B
  discount: string; // P_10
  net: string; // P_11
  gross: string; // P_11A
  vat: string; // P_11Vat
  rate: string; // P_12
  ossRate: string; // P_12_XII
  annex15: boolean; // P_12_Zal_15
  excise: string;
  gtu: string;
  procedure: string;
  fxRate: string;
  /** StanPrzed: the line shows the state before correction. */
  before: boolean;
}

/** One row of the VAT summary (P_13_x net, P_14_x tax, P_14_xW tax in PLN). */
export interface KsefVatRow {
  code: string;
  net: string;
  tax: string;
  taxPln: string;
}

export interface KsefInvoice {
  variant: KsefVariant;
  schemaVersion: string;
  created: string;
  systemInfo: string;
  seller: KsefParty;
  buyer: KsefParty;
  others: KsefParty[];
  authorised: KsefParty | null;
  currency: string;
  issueDate: string; // P_1
  place: string; // P_1M
  number: string; // P_2
  wz: string[];
  saleDate: string; // P_6
  periodFrom: string;
  periodTo: string;
  vat: KsefVatRow[];
  total: string; // P_15
  fxRate: string; // KursWalutyZ
  kind: string; // RodzajFaktury
  annotations: {
    cashMethod: boolean; // P_16
    selfBilling: boolean; // P_17
    reverseCharge: boolean; // P_18
    splitPayment: boolean; // P_18A
    exempt: { basis: 'A' | 'B' | 'C' | ''; text: string } | null; // P_19*
    newTransport: boolean; // P_22
    triangular: boolean; // P_23
    margin: '' | 'travel' | 'used' | 'art' | 'antiques' | 'other';
  };
  correction: {
    reason: string;
    type: string;
    invoices: { date: string; number: string; ksef: string }[];
    period: string;
    correctedNumber: string;
    totalBefore: string; // P_15ZK
  } | null;
  advances: { date: string; amount: string; fxRate: string }[];
  extra: { line: string; key: string; value: string }[];
  advanceInvoices: { ksef: string; number: string }[];
  lines: KsefLine[];
  orderValue: string;
  orderLines: KsefLine[];
  settlement: {
    charges: { amount: string; reason: string }[];
    chargesTotal: string;
    deductions: { amount: string; reason: string }[];
    deductionsTotal: string;
    toPay: string;
    toSettle: string;
  } | null;
  payment: {
    paid: boolean;
    paidDate: string;
    partial: { amount: string; date: string; form: string }[];
    terms: { date: string; description: string }[];
    form: string;
    otherForm: string;
    accounts: { nrb: string; swift: string; bank: string; description: string; factor: boolean }[];
    discount: { conditions: string; amount: string } | null;
    link: string;
    ipksef: string;
  } | null;
  conditions: {
    contracts: { date: string; number: string }[];
    orders: { date: string; number: string }[];
    batches: string[];
    deliveryTerms: string;
    transportCount: number;
  } | null;
  footer: { info: string[]; registers: { name: string; krs: string; regon: string; bdo: string }[] };
  attachment: KsefAttachmentBlock[];
}

export interface KsefAttachmentBlock {
  heading: string;
  meta: { key: string; value: string }[];
  paragraphs: string[];
  tables: { meta: { key: string; value: string }[]; description: string; head: string[]; rows: string[][]; sum: string[] }[];
}

export class NotKsefError extends Error {
  /** What the file looks like instead, so a caller can point the reader to the right parser. */
  kind: 'ubl' | 'cii' | 'fatturapa' | 'other' | 'fa1' | 'farr';
  root: string;
  constructor(kind: NotKsefError['kind'], root: string) {
    super(`not-ksef:${kind}`);
    this.kind = kind;
    this.root = root;
  }
}

const VAT_CODES = ['1', '2', '3', '4', '5', '6_1', '6_2', '6_3', '7', '8', '9', '10', '11'];

const one = (el: Element | null, path: string) => text(el, path) === '1';

function address(el: Element | null): KsefAddress | null {
  if (!el) return null;
  return { country: text(el, 'KodKraju'), line1: text(el, 'AdresL1'), line2: text(el, 'AdresL2'), gln: text(el, 'GLN') };
}

function party(el: Element | null): KsefParty {
  const id = first(el, 'DaneIdentyfikacyjne');
  return {
    nip: text(id, 'NIP'),
    internalId: text(id, 'IDWew'),
    euCode: text(id, 'KodUE'),
    euVat: text(id, 'NrVatUE'),
    countryCode: text(id, 'KodKraju'),
    otherId: text(id, 'NrID'),
    noId: text(id, 'BrakID') === '1',
    name: text(id, 'Nazwa'),
    prefix: text(el, 'PrefiksPodatnika'),
    eori: text(el, 'NrEORI'),
    address: address(first(el, 'Adres')),
    correspondence: address(first(el, 'AdresKoresp')),
    contacts: all(el, 'DaneKontaktowe').map((c) => ({ email: text(c, 'Email') || text(c, 'EmailPU'), phone: text(c, 'Telefon') || text(c, 'TelefonPU') })),
    customerNo: text(el, 'NrKlienta'),
    buyerId: text(el, 'IDNabywcy'),
    jst: text(el, 'JST'),
    gv: text(el, 'GV'),
    role: text(el, 'Rola') || text(el, 'RolaPU'),
    roleOther: text(el, 'RolaInna'),
    roleDescription: text(el, 'OpisRoli'),
    share: text(el, 'Udzial'),
    status: text(el, 'StatusInfoPodatnika'),
  };
}

function line(el: Element, z = ''): KsefLine {
  // Order lines (ZamowienieWiersz) use the same field names with a "Z" suffix.
  const f = (name: string) => text(el, `${name}${z}`);
  return {
    no: z ? text(el, 'NrWierszaZam') : text(el, 'NrWierszaFa'),
    date: z ? '' : text(el, 'P_6A'),
    name: f('P_7'),
    index: f('Indeks'),
    gtin: f('GTIN'),
    pkwiu: f('PKWiU'),
    cn: f('CN'),
    pkob: f('PKOB'),
    unit: f('P_8A'),
    qty: f('P_8B'),
    unitNet: f('P_9A'),
    unitGross: z ? '' : text(el, 'P_9B'),
    discount: z ? '' : text(el, 'P_10'),
    net: z ? text(el, 'P_11NettoZ') : text(el, 'P_11'),
    gross: z ? '' : text(el, 'P_11A'),
    vat: z ? text(el, 'P_11VatZ') : text(el, 'P_11Vat'),
    rate: f('P_12'),
    ossRate: z ? text(el, 'P_12Z_XII') : text(el, 'P_12_XII'),
    annex15: (z ? text(el, 'P_12Z_Zal_15') : text(el, 'P_12_Zal_15')) === '1',
    excise: f('KwotaAkcyzy'),
    gtu: f('GTU'),
    procedure: f('Procedura'),
    fxRate: z ? '' : text(el, 'KursWaluty'),
    before: (z ? text(el, 'StanPrzedZ') : text(el, 'StanPrzed')) === '1',
  };
}

function marginKind(pm: Element | null): KsefInvoice['annotations']['margin'] {
  if (!pm || text(pm, 'P_PMarzy') !== '1') return '';
  if (one(pm, 'P_PMarzy_2')) return 'travel';
  if (one(pm, 'P_PMarzy_3_1')) return 'used';
  if (one(pm, 'P_PMarzy_3_2')) return 'art';
  if (one(pm, 'P_PMarzy_3_3')) return 'antiques';
  return 'other';
}

function exemption(z: Element | null): KsefInvoice['annotations']['exempt'] {
  if (!z || text(z, 'P_19') !== '1') return null;
  for (const b of ['A', 'B', 'C'] as const) {
    const v = text(z, `P_19${b}`);
    if (v) return { basis: b, text: v };
  }
  return { basis: '', text: '' };
}

function keyValues(els: Element[], k: string, v: string) {
  return els.map((e) => ({ key: text(e, k), value: text(e, v) }));
}

function attachmentBlocks(z: Element | null): KsefAttachmentBlock[] {
  return all(z, 'BlokDanych').map((b) => ({
    heading: text(b, 'ZNaglowek'),
    meta: keyValues(all(b, 'MetaDane'), 'ZKlucz', 'ZWartosc'),
    paragraphs: texts(b, 'Tekst/Akapit'),
    tables: all(b, 'Tabela').map((t) => ({
      meta: keyValues(all(t, 'TMetaDane'), 'TKlucz', 'TWartosc'),
      description: text(t, 'Opis'),
      head: all(t, 'TNaglowek/Kol').map((k) => text(k, 'NKom')),
      rows: all(t, 'Wiersz').map((w) => all(w, 'WKom').map((c) => text(c))),
      sum: all(t, 'Suma/SKom').map((c) => text(c)),
    })),
  }));
}

/** Detects the structure from KodFormularza/@kodSystemowy, e.g. "FA (3)". */
export function ksefVariant(doc: Document): string {
  return attr(first(doc.documentElement, 'Naglowek'), 'KodFormularza', 'kodSystemowy').replace(/\s+/g, ' ');
}

export function parseKsef(xmlText: string, parser: XmlParser): KsefInvoice {
  const doc = parseXml(xmlText, parser);
  const name = rootName(doc);
  const ns = doc.documentElement.namespaceURI ?? '';
  if (name !== 'Faktura') {
    const kind = (name === 'Invoice' || name === 'CreditNote') && ns.includes('oasis') ? 'ubl' : name === 'CrossIndustryInvoice' ? 'cii' : name === 'FatturaElettronica' ? 'fatturapa' : 'other';
    throw new NotKsefError(kind, name);
  }
  const variant = ksefVariant(doc);
  if (variant === 'FA (1)') throw new NotKsefError('fa1', name);
  if (/^FA_RR/.test(variant)) throw new NotKsefError('farr', name);
  if (variant !== 'FA (3)' && variant !== 'FA (2)') throw new NotKsefError('other', name);

  const root = doc.documentElement;
  const fa = first(root, 'Fa');
  const ad = first(fa, 'Adnotacje');
  const kind = text(fa, 'RodzajFaktury');
  const roz = first(fa, 'Rozliczenie');
  const pl = first(fa, 'Platnosc');
  const wt = first(fa, 'WarunkiTransakcji');
  const isCorrection = kind.startsWith('KOR');

  return {
    variant,
    schemaVersion: attr(first(root, 'Naglowek'), 'KodFormularza', 'wersjaSchemy'),
    created: text(root, 'Naglowek/DataWytworzeniaFa'),
    systemInfo: text(root, 'Naglowek/SystemInfo'),
    seller: party(first(root, 'Podmiot1')),
    buyer: party(first(root, 'Podmiot2')),
    others: all(root, 'Podmiot3').map(party),
    authorised: first(root, 'PodmiotUpowazniony') ? party(first(root, 'PodmiotUpowazniony')) : null,
    currency: text(fa, 'KodWaluty'),
    issueDate: text(fa, 'P_1'),
    place: text(fa, 'P_1M'),
    number: text(fa, 'P_2'),
    wz: texts(fa, 'WZ'),
    saleDate: text(fa, 'P_6'),
    periodFrom: text(fa, 'OkresFa/P_6_Od'),
    periodTo: text(fa, 'OkresFa/P_6_Do'),
    vat: VAT_CODES.map((code) => ({ code, net: text(fa, `P_13_${code}`), tax: text(fa, `P_14_${code}`), taxPln: text(fa, `P_14_${code}W`) })).filter(
      (r) => r.net || r.tax,
    ),
    total: text(fa, 'P_15'),
    fxRate: text(fa, 'KursWalutyZ'),
    kind,
    annotations: {
      cashMethod: one(ad, 'P_16'),
      selfBilling: one(ad, 'P_17'),
      reverseCharge: one(ad, 'P_18'),
      splitPayment: one(ad, 'P_18A'),
      exempt: exemption(first(ad, 'Zwolnienie')),
      newTransport: one(ad, 'NoweSrodkiTransportu/P_22'),
      triangular: one(ad, 'P_23'),
      margin: marginKind(first(ad, 'PMarzy')),
    },
    correction: isCorrection
      ? {
          reason: text(fa, 'PrzyczynaKorekty'),
          type: text(fa, 'TypKorekty'),
          invoices: all(fa, 'DaneFaKorygowanej').map((d) => ({
            date: text(d, 'DataWystFaKorygowanej'),
            number: text(d, 'NrFaKorygowanej'),
            ksef: text(d, 'NrKSeFFaKorygowanej'),
          })),
          period: text(fa, 'OkresFaKorygowanej'),
          correctedNumber: text(fa, 'NrFaKorygowany'),
          totalBefore: text(fa, 'P_15ZK'),
        }
      : null,
    advances: all(fa, 'ZaliczkaCzesciowa').map((z) => ({ date: text(z, 'P_6Z'), amount: text(z, 'P_15Z'), fxRate: text(z, 'KursWalutyZW') })),
    extra: all(fa, 'DodatkowyOpis').map((d) => ({ line: text(d, 'NrWiersza'), key: text(d, 'Klucz'), value: text(d, 'Wartosc') })),
    advanceInvoices: all(fa, 'FakturaZaliczkowa').map((z) => ({ ksef: text(z, 'NrKSeFFaZaliczkowej'), number: text(z, 'NrFaZaliczkowej') })),
    lines: all(fa, 'FaWiersz').map((l) => line(l)),
    orderValue: text(fa, 'Zamowienie/WartoscZamowienia'),
    orderLines: all(fa, 'Zamowienie/ZamowienieWiersz').map((l) => line(l, 'Z')),
    settlement: roz
      ? {
          charges: all(roz, 'Obciazenia').map((o) => ({ amount: text(o, 'Kwota'), reason: text(o, 'Powod') })),
          chargesTotal: text(roz, 'SumaObciazen'),
          deductions: all(roz, 'Odliczenia').map((o) => ({ amount: text(o, 'Kwota'), reason: text(o, 'Powod') })),
          deductionsTotal: text(roz, 'SumaOdliczen'),
          toPay: text(roz, 'DoZaplaty'),
          toSettle: text(roz, 'DoRozliczenia'),
        }
      : null,
    payment: pl
      ? {
          paid: one(pl, 'Zaplacono'),
          paidDate: text(pl, 'DataZaplaty'),
          partial: all(pl, 'ZaplataCzesciowa').map((z) => ({
            amount: text(z, 'KwotaZaplatyCzesciowej'),
            date: text(z, 'DataZaplatyCzesciowej'),
            form: text(z, 'FormaPlatnosci') || text(z, 'OpisPlatnosci'),
          })),
          terms: all(pl, 'TerminPlatnosci').map((t) => {
            const opis = first(t, 'TerminOpis');
            // FA(2) writes the description as text, FA(3) splits it into quantity, unit and starting event.
            const parts = elementChildren(opis).map((c) => text(c));
            return { date: text(t, 'Termin'), description: parts.length ? parts.join(' ') : text(opis) };
          }),
          form: text(pl, 'FormaPlatnosci'),
          otherForm: one(pl, 'PlatnoscInna') ? text(pl, 'OpisPlatnosci') : '',
          accounts: [
            ...all(pl, 'RachunekBankowy').map((r) => ({ r, factor: false })),
            ...all(pl, 'RachunekBankowyFaktora').map((r) => ({ r, factor: true })),
          ].map(({ r, factor }) => ({ nrb: text(r, 'NrRB'), swift: text(r, 'SWIFT'), bank: text(r, 'NazwaBanku'), description: text(r, 'OpisRachunku'), factor })),
          discount: first(pl, 'Skonto') ? { conditions: text(pl, 'Skonto/WarunkiSkonta'), amount: text(pl, 'Skonto/WysokoscSkonta') } : null,
          link: text(pl, 'LinkDoPlatnosci'),
          ipksef: text(pl, 'IPKSeF'),
        }
      : null,
    conditions: wt
      ? {
          contracts: all(wt, 'Umowy').map((u) => ({ date: text(u, 'DataUmowy'), number: text(u, 'NrUmowy') })),
          orders: all(wt, 'Zamowienia').map((u) => ({ date: text(u, 'DataZamowienia'), number: text(u, 'NrZamowienia') })),
          batches: texts(wt, 'NrPartiiTowaru'),
          deliveryTerms: text(wt, 'WarunkiDostawy'),
          transportCount: all(wt, 'Transport').length,
        }
      : null,
    footer: {
      info: texts(root, 'Stopka/Informacje/StopkaFaktury'),
      registers: all(root, 'Stopka/Rejestry').map((r) => ({ name: text(r, 'PelnaNazwa'), krs: text(r, 'KRS'), regon: text(r, 'REGON'), bdo: text(r, 'BDO') })),
    },
    attachment: attachmentBlocks(first(root, 'Zalacznik')),
  };
}

/** A KSeF number as KSeF prints it: seller NIP, issue date, 12 hex digits, 2 check characters. */
export const KSEF_NUMBER_RE = /\b(\d{10}-\d{8}-[0-9A-F]{12}-[0-9A-F]{2})\b/i;

export function ksefNumberFromFileName(name: string): string {
  return KSEF_NUMBER_RE.exec(name)?.[1].toUpperCase() ?? '';
}

