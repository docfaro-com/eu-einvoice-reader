import type { Lang } from './codes.ts';
import { describeProfile } from './detect.ts';
import type { Invoice } from './model.ts';

/*
 * A handful of EN 16931 / XRechnung business rules that can be checked from
 * the parsed data alone. This is a plausibility pre-check, not the official
 * KoSIT validation (no XSD, no Schematron).
 */

const SCALE = 1_000_000n;
const TOLERANCE = 10_000n; // 0.01 at SCALE

/** Exact decimal parse into a scaled BigInt; returns null for empty or malformed input. */
export function dec(s: string): bigint | null {
  const m = /^\s*([+-])?(\d*)(?:\.(\d*))?\s*$/.exec(s ?? '');
  if (!m || (!m[2] && !m[3])) return null;
  const frac = (m[3] ?? '').padEnd(6, '0').slice(0, 6);
  const v = BigInt(m[2] || '0') * SCALE + BigInt(frac || '0');
  return m[1] === '-' ? -v : v;
}

export function fromDec(v: bigint): string {
  const neg = v < 0n;
  const a = neg ? -v : v;
  const cents = (a + 5_000n) / 10_000n;
  const s = `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
  return neg ? `-${s}` : s;
}

const sum = (xs: (bigint | null)[]) => xs.reduce<bigint>((a, b) => a + (b ?? 0n), 0n);
const close = (a: bigint, b: bigint) => (a > b ? a - b : b - a) <= TOLERANCE;

export function ibanValid(iban: string): boolean {
  const s = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const code = ch.charCodeAt(0);
    const digits = code >= 65 ? String(code - 55) : ch;
    for (const d of digits) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
}

/** Belgian enterprise and VAT numbers: 10 digits, the last two equal 97 − (first eight mod 97). */
export function beCheckDigitsValid(raw: string): boolean {
  const digits = raw.replace(/^BE/i, '').replace(/[\s.]/g, '');
  if (!/^[01]\d{9}$/.test(digits)) return false;
  return 97 - (Number(digits.slice(0, 8)) % 97) === Number(digits.slice(8));
}

export type CheckStatus = 'pass' | 'fail' | 'warn';
export interface CheckResult {
  rule: string;
  status: CheckStatus;
  message: string;
}

type Msg = Partial<Record<Lang, (p: Record<string, string>) => string>> & Record<'en', (p: Record<string, string>) => string>;

const M: Record<string, Msg> = {
  required: {
    de: (p) => `Pflichtangabe vorhanden: ${p.field}`,
    en: (p) => `Mandatory field present: ${p.field}`,
    it: (p) => `Campo obbligatorio presente: ${p.field}`,
    nl: (p) => `Verplicht gegeven aanwezig: ${p.field}`,
    fr: (p) => `Donnée obligatoire présente : ${p.field}`,
  },
  missing: {
    de: (p) => `Pflichtangabe fehlt: ${p.field}`,
    en: (p) => `Mandatory field missing: ${p.field}`,
    it: (p) => `Campo obbligatorio mancante: ${p.field}`,
    nl: (p) => `Verplicht gegeven ontbreekt: ${p.field}`,
    fr: (p) => `Donnée obligatoire manquante : ${p.field}`,
  },
  lineSum: {
    de: (p) => `Summe der Positionen (${p.actual}) ${p.ok === '1' ? 'entspricht' : 'weicht ab von'} der Nettosumme (${p.expected})`,
    en: (p) => `Sum of line amounts (${p.actual}) ${p.ok === '1' ? 'matches' : 'differs from'} the line total (${p.expected})`,
    it: (p) => `Somma delle righe (${p.actual}) ${p.ok === '1' ? 'coincide con' : 'diversa da'} il totale righe (${p.expected})`,
    nl: (p) => `Som van de factuurlijnen (${p.actual}) ${p.ok === '1' ? 'komt overeen met' : 'wijkt af van'} het vermelde totaal van de lijnen (${p.expected})`,
    fr: (p) => `Somme des lignes (${p.actual}) ${p.ok === '1' ? 'égale au' : 'différente du'} total des lignes (${p.expected})`,
  },
  taxExclusive: {
    de: (p) => `Nettosumme − Nachlässe + Zuschläge = ${p.actual}, ausgewiesen: ${p.expected}`,
    en: (p) => `Line total − allowances + charges = ${p.actual}, stated: ${p.expected}`,
    it: (p) => `Totale righe − sconti + maggiorazioni = ${p.actual}, indicato: ${p.expected}`,
    nl: (p) => `Totaal lijnen − kortingen + toeslagen = ${p.actual}, vermeld: ${p.expected}`,
    fr: (p) => `Total des lignes − remises + suppléments = ${p.actual}, indiqué : ${p.expected}`,
  },
  allowanceSum: {
    de: (p) => `Summe der Nachlässe auf Belegebene = ${p.actual}, ausgewiesen: ${p.expected}`,
    en: (p) => `Sum of document-level allowances = ${p.actual}, stated: ${p.expected}`,
    it: (p) => `Somma degli sconti sul documento = ${p.actual}, indicata: ${p.expected}`,
    nl: (p) => `Som van de kortingen op documentniveau = ${p.actual}, vermeld: ${p.expected}`,
    fr: (p) => `Somme des remises au niveau du document = ${p.actual}, indiquée : ${p.expected}`,
  },
  chargeSum: {
    de: (p) => `Summe der Zuschläge auf Belegebene = ${p.actual}, ausgewiesen: ${p.expected}`,
    en: (p) => `Sum of document-level charges = ${p.actual}, stated: ${p.expected}`,
    it: (p) => `Somma delle maggiorazioni sul documento = ${p.actual}, indicata: ${p.expected}`,
    nl: (p) => `Som van de toeslagen op documentniveau = ${p.actual}, vermeld: ${p.expected}`,
    fr: (p) => `Somme des suppléments au niveau du document = ${p.actual}, indiquée : ${p.expected}`,
  },
  taxSum: {
    de: (p) => `Summe der Steuerbeträge je Satz = ${p.actual}, ausgewiesen: ${p.expected}`,
    en: (p) => `Sum of VAT per rate = ${p.actual}, stated: ${p.expected}`,
    it: (p) => `Somma IVA per aliquota = ${p.actual}, indicata: ${p.expected}`,
    nl: (p) => `Som van de btw per tarief = ${p.actual}, vermeld: ${p.expected}`,
    fr: (p) => `Somme de la TVA par taux = ${p.actual}, indiquée : ${p.expected}`,
  },
  taxInclusive: {
    de: (p) => `Netto + Umsatzsteuer = ${p.actual}, ausgewiesener Bruttobetrag: ${p.expected}`,
    en: (p) => `Net + VAT = ${p.actual}, stated gross total: ${p.expected}`,
    it: (p) => `Imponibile + IVA = ${p.actual}, totale indicato: ${p.expected}`,
    nl: (p) => `Excl. btw + btw = ${p.actual}, vermeld totaal incl. btw: ${p.expected}`,
    fr: (p) => `Hors TVA + TVA = ${p.actual}, total TVAC indiqué : ${p.expected}`,
    'fr-FR': (p) => `Hors TVA + TVA = ${p.actual}, total TTC indiqué : ${p.expected}`,
  },
  payable: {
    de: (p) => `Brutto − Anzahlungen + Rundung = ${p.actual}, ausgewiesener Zahlbetrag: ${p.expected}`,
    en: (p) => `Gross − prepaid + rounding = ${p.actual}, stated amount due: ${p.expected}`,
    it: (p) => `Totale − acconti + arrotondamento = ${p.actual}, importo dovuto indicato: ${p.expected}`,
    nl: (p) => `Totaal − reeds betaald + afronding = ${p.actual}, vermeld te betalen bedrag: ${p.expected}`,
    fr: (p) => `Total − déjà payé + arrondi = ${p.actual}, montant à payer indiqué : ${p.expected}`,
  },
  rate: {
    de: (p) => `Steuer für ${p.rate} %: ${p.taxable} × ${p.rate} % = ${p.actual}, ausgewiesen: ${p.expected}`,
    en: (p) => `VAT at ${p.rate}%: ${p.taxable} × ${p.rate}% = ${p.actual}, stated: ${p.expected}`,
    it: (p) => `IVA al ${p.rate}%: ${p.taxable} × ${p.rate}% = ${p.actual}, indicata: ${p.expected}`,
    nl: (p) => `Btw aan ${p.rate} %: ${p.taxable} × ${p.rate} % = ${p.actual}, vermeld: ${p.expected}`,
    fr: (p) => `TVA à ${p.rate} % : ${p.taxable} × ${p.rate} % = ${p.actual}, indiquée : ${p.expected}`,
  },
  iban: {
    de: (p) => `IBAN ${p.iban}: Prüfziffer ${p.ok === '1' ? 'korrekt' : 'falsch'}`,
    en: (p) => `IBAN ${p.iban}: check digits ${p.ok === '1' ? 'valid' : 'invalid'}`,
    it: (p) => `IBAN ${p.iban}: cifre di controllo ${p.ok === '1' ? 'corrette' : 'errate'}`,
    nl: (p) => `IBAN ${p.iban}: controlegetal ${p.ok === '1' ? 'juist' : 'onjuist'}`,
    fr: (p) => `IBAN ${p.iban} : chiffres de contrôle ${p.ok === '1' ? 'corrects' : 'incorrects'}`,
  },
  sellerTaxId: {
    de: () => 'Verkäufer hat weder Kennung noch Registernummer noch USt-IdNr. angegeben',
    en: () => 'Seller gives neither an identifier, a registration number nor a VAT ID',
    it: () => 'Il cedente non indica né un identificativo, né un numero di registro, né la partita IVA',
    nl: () => 'De leverancier vermeldt geen identificatie, geen registratienummer en geen btw-nummer',
    fr: () => 'Le fournisseur n’indique ni identifiant, ni numéro d’immatriculation, ni numéro de TVA',
  },
  sellerTaxIdOk: {
    de: () => 'Kennung, Registernummer oder USt-IdNr. des Verkäufers angegeben',
    en: () => 'Seller identifier, registration number or VAT ID present',
    it: () => 'Identificativo, numero di registro o partita IVA del cedente presente',
    nl: () => 'Identificatie, registratienummer of btw-nummer van de leverancier aanwezig',
    fr: () => 'Identifiant, numéro d’immatriculation ou numéro de TVA du fournisseur présent',
  },
  profileMinimal: {
    de: () => 'Profil enthält keinen vollständigen EN-16931-Datensatz (z. B. MINIMUM, BASIC WL, ZUGFeRD 1.0)',
    en: () => 'Profile does not carry a full EN 16931 data set (e.g. MINIMUM, BASIC WL, ZUGFeRD 1.0)',
    it: () => 'Il profilo non contiene un set di dati EN 16931 completo (es. MINIMUM, BASIC WL, ZUGFeRD 1.0)',
    nl: () => 'Profiel bevat geen volledige EN 16931-gegevensset (bv. MINIMUM, BASIC WL, ZUGFeRD 1.0)',
    fr: () => 'Le profil ne contient pas un jeu de données EN 16931 complet (p. ex. MINIMUM, BASIC WL, ZUGFeRD 1.0)',
  },
  buyerRefOrOrder: {
    de: (p) => `Käuferreferenz oder Bestellnummer ${p.ok === '1' ? 'vorhanden' : 'fehlt'} (BT-10 / BT-13)`,
    en: (p) => `Buyer reference or purchase order reference ${p.ok === '1' ? 'present' : 'missing'} (BT-10 / BT-13)`,
    nl: (p) => `Referentie koper of bestelnummer ${p.ok === '1' ? 'aanwezig' : 'ontbreekt'} (BT-10 / BT-13)`,
    fr: (p) => `Référence acheteur ou numéro de commande ${p.ok === '1' ? 'présent' : 'manquant'} (BT-10 / BT-13)`,
  },
  beEnterprise: {
    de: (p) => `Belgische Unternehmensnummer ${p.value}: Prüfziffer ${p.ok === '1' ? 'korrekt' : 'falsch'}`,
    en: (p) => `Belgian enterprise number ${p.value}: check digits ${p.ok === '1' ? 'valid' : 'invalid'}`,
    nl: (p) => `Ondernemingsnummer ${p.value}: controlegetal ${p.ok === '1' ? 'juist' : 'onjuist'}`,
    fr: (p) => `Numéro d’entreprise ${p.value} : chiffres de contrôle ${p.ok === '1' ? 'corrects' : 'incorrects'}`,
  },
  beVat: {
    de: (p) => `Belgische USt-IdNr. ${p.value}: Prüfziffer ${p.ok === '1' ? 'korrekt' : 'falsch'}`,
    en: (p) => `Belgian VAT number ${p.value}: check digits ${p.ok === '1' ? 'valid' : 'invalid'}`,
    nl: (p) => `Btw-nummer ${p.value}: controlegetal ${p.ok === '1' ? 'juist' : 'onjuist'}`,
    fr: (p) => `Numéro de TVA ${p.value} : chiffres de contrôle ${p.ok === '1' ? 'corrects' : 'incorrects'}`,
  },
};

const FIELDS: Record<string, Partial<Record<Lang, string>> & Record<'en', string>> = {
  'BT-1': { de: 'Rechnungsnummer (BT-1)', en: 'Invoice number (BT-1)', it: 'Numero fattura (BT-1)', nl: 'Factuurnummer (BT-1)', fr: 'Numéro de facture (BT-1)' },
  'BT-2': { de: 'Rechnungsdatum (BT-2)', en: 'Issue date (BT-2)', it: 'Data fattura (BT-2)', nl: 'Factuurdatum (BT-2)', fr: 'Date de facture (BT-2)' },
  'BT-3': { de: 'Rechnungsart (BT-3)', en: 'Invoice type (BT-3)', it: 'Tipo documento (BT-3)', nl: 'Soort factuur (BT-3)', fr: 'Type de facture (BT-3)' },
  'BT-5': { de: 'Währung (BT-5)', en: 'Currency (BT-5)', it: 'Valuta (BT-5)', nl: 'Munt (BT-5)', fr: 'Devise (BT-5)' },
  'BT-10': { de: 'Käuferreferenz / Leitweg-ID (BT-10)', en: 'Buyer reference / Leitweg-ID (BT-10)', it: 'Riferimento acquirente (BT-10)', nl: 'Referentie koper (BT-10)', fr: 'Référence acheteur (BT-10)' },
  'BT-27': { de: 'Name des Verkäufers (BT-27)', en: 'Seller name (BT-27)', it: 'Nome cedente (BT-27)', nl: 'Naam leverancier (BT-27)', fr: 'Nom du fournisseur (BT-27)' },
  'BT-44': { de: 'Name des Käufers (BT-44)', en: 'Buyer name (BT-44)', it: 'Nome cessionario (BT-44)', nl: 'Naam klant (BT-44)', fr: 'Nom du client (BT-44)' },
  'BT-40': { de: 'Land des Verkäufers (BT-40)', en: 'Seller country (BT-40)', it: 'Paese cedente (BT-40)', nl: 'Land leverancier (BT-40)', fr: 'Pays du fournisseur (BT-40)' },
  'BT-55': { de: 'Land des Käufers (BT-55)', en: 'Buyer country (BT-55)', it: 'Paese cessionario (BT-55)', nl: 'Land klant (BT-55)', fr: 'Pays du client (BT-55)' },
  'BT-115': { de: 'Zahlbetrag (BT-115)', en: 'Amount due (BT-115)', it: 'Importo dovuto (BT-115)', nl: 'Te betalen bedrag (BT-115)', fr: 'Montant à payer (BT-115)' },
  'BG-25': { de: 'Mindestens eine Rechnungsposition (BG-25)', en: 'At least one invoice line (BG-25)', it: 'Almeno una riga (BG-25)', nl: 'Minstens één factuurlijn (BG-25)', fr: 'Au moins une ligne de facture (BG-25)' },
  'BG-6': { de: 'Kontakt des Verkäufers: Name, Telefon, E-Mail (BG-6)', en: 'Seller contact: name, phone, email (BG-6)', it: 'Contatto cedente (BG-6)', nl: 'Contactgegevens leverancier (BG-6)', fr: 'Contact du fournisseur (BG-6)' },
  'BT-23': { de: 'Geschäftsprozess (BT-23)', en: 'Business process (BT-23)', nl: 'Bedrijfsproces (BT-23)', fr: 'Processus métier (BT-23)' },
  'BT-34': { de: 'Elektronische Adresse des Verkäufers (BT-34)', en: 'Seller electronic address (BT-34)', nl: 'Elektronisch adres leverancier (BT-34)', fr: 'Adresse électronique du fournisseur (BT-34)' },
  'BT-49': { de: 'Elektronische Adresse des Käufers (BT-49)', en: 'Buyer electronic address (BT-49)', nl: 'Elektronisch adres klant (BT-49)', fr: 'Adresse électronique du client (BT-49)' },
  'BG-16': { de: 'Zahlungsanweisungen (BG-16)', en: 'Payment instructions (BG-16)', it: 'Istruzioni di pagamento (BG-16)', nl: 'Betalingsinstructies (BG-16)', fr: 'Instructions de paiement (BG-16)' },
};

export function runChecks(inv: Invoice, lang: Lang): CheckResult[] {
  const out: CheckResult[] = [];
  const fmt = (v: bigint | null) => (v === null ? '–' : fromDec(v));
  const add = (rule: string, status: CheckStatus, key: string, p: Record<string, string> = {}) =>
    out.push({ rule, status, message: (M[key][lang] ?? (lang === 'fr-FR' ? M[key].fr : undefined) ?? M[key].en)(p) });

  const profile = describeProfile(inv.customizationId);
  if (!profile.meetsEn16931) add('Profile', 'warn', 'profileMinimal');

  const required: [string, string, string][] = [
    ['BR-02', 'BT-1', inv.number],
    ['BR-03', 'BT-2', inv.issueDate],
    ['BR-04', 'BT-3', inv.typeCode],
    ['BR-05', 'BT-5', inv.currency],
    ['BR-06', 'BT-27', inv.seller.name],
    ['BR-07', 'BT-44', inv.buyer.name],
    ['BR-09', 'BT-40', inv.seller.address.country],
    ['BR-11', 'BT-55', inv.buyer.address.country],
    ['BR-15', 'BT-115', inv.totals.payable],
  ];
  if (profile.meetsEn16931) required.push(['BR-16', 'BG-25', inv.lines.length ? 'x' : '']);
  if (profile.standard === 'peppol') {
    required.push(['PEPPOL-EN16931-R001', 'BT-23', inv.profileId]);
    required.push(['PEPPOL-EN16931-R020', 'BT-34', inv.seller.endpoint?.value ?? '']);
    required.push(['PEPPOL-EN16931-R010', 'BT-49', inv.buyer.endpoint?.value ?? '']);
  }
  if (profile.standard === 'xrechnung') {
    const c = inv.seller.contact;
    required.push(['BR-DE-15', 'BT-10', inv.buyerReference]);
    required.push(['BR-DE-2', 'BG-6', c.name && c.phone && c.email ? 'x' : '']);
    required.push(['BR-DE-1', 'BG-16', inv.paymentMeans.length ? 'x' : '']);
  }
  // Reduced profiles legitimately omit most mandatory fields; flagging each would just be noise.
  for (const [rule, field, value] of profile.meetsEn16931 ? required : []) {
    add(rule, value ? 'pass' : 'fail', value ? 'required' : 'missing', { field: FIELDS[field][lang] ?? (lang === 'fr-FR' ? FIELDS[field].fr : undefined) ?? FIELDS[field].en });
  }

  // BR-CO-26: the buyer must be able to identify the seller by an identifier, a legal registration ID or a VAT ID.
  const hasSellerId = Boolean(inv.seller.ids.some((i) => i.value) || inv.seller.legalId || inv.seller.vatId);
  if (profile.meetsEn16931) add('BR-CO-26', hasSellerId ? 'pass' : 'warn', hasSellerId ? 'sellerTaxIdOk' : 'sellerTaxId');

  const t = inv.totals;
  const lineTotal = dec(t.lineTotal);
  if (lineTotal !== null && inv.lines.length) {
    const s = sum(inv.lines.map((l) => dec(l.amount)));
    const ok = close(s, lineTotal);
    add('BR-CO-10', ok ? 'pass' : 'fail', 'lineSum', { actual: fmt(s), expected: fmt(lineTotal), ok: ok ? '1' : '0' });
  }
  const allowances = inv.allowancesCharges.filter((a) => !a.isCharge);
  const charges = inv.allowancesCharges.filter((a) => a.isCharge);
  if (allowances.length || dec(t.allowanceTotal) !== null) {
    const s = sum(allowances.map((a) => dec(a.amount)));
    const stated = dec(t.allowanceTotal) ?? 0n;
    add('BR-CO-11', close(s, stated) ? 'pass' : 'fail', 'allowanceSum', { actual: fmt(s), expected: fmt(stated) });
  }
  if (charges.length || dec(t.chargeTotal) !== null) {
    const s = sum(charges.map((a) => dec(a.amount)));
    const stated = dec(t.chargeTotal) ?? 0n;
    add('BR-CO-12', close(s, stated) ? 'pass' : 'fail', 'chargeSum', { actual: fmt(s), expected: fmt(stated) });
  }
  const taxExcl = dec(t.taxExclusive);
  if (lineTotal !== null && taxExcl !== null) {
    const calc = lineTotal - (dec(t.allowanceTotal) ?? 0n) + (dec(t.chargeTotal) ?? 0n);
    add('BR-CO-13', close(calc, taxExcl) ? 'pass' : 'fail', 'taxExclusive', { actual: fmt(calc), expected: fmt(taxExcl) });
  }
  const taxTotal = dec(t.taxTotal);
  if (taxTotal !== null && inv.vat.length) {
    const s = sum(inv.vat.map((v) => dec(v.tax)));
    add('BR-CO-14', close(s, taxTotal) ? 'pass' : 'fail', 'taxSum', { actual: fmt(s), expected: fmt(taxTotal) });
  }
  const taxIncl = dec(t.taxInclusive);
  if (taxExcl !== null && taxIncl !== null) {
    const calc = taxExcl + (taxTotal ?? 0n);
    add('BR-CO-15', close(calc, taxIncl) ? 'pass' : 'fail', 'taxInclusive', { actual: fmt(calc), expected: fmt(taxIncl) });
  }
  const payable = dec(t.payable);
  if (taxIncl !== null && payable !== null) {
    const calc = taxIncl - (dec(t.prepaid) ?? 0n) + (dec(t.rounding) ?? 0n);
    add('BR-CO-16', close(calc, payable) ? 'pass' : 'fail', 'payable', { actual: fmt(calc), expected: fmt(payable) });
  }
  for (const v of inv.vat) {
    const taxable = dec(v.taxable);
    const tax = dec(v.tax);
    const rate = dec(v.rate);
    if (v.category !== 'S' || taxable === null || tax === null || rate === null) continue;
    const calc = (taxable * rate) / (100n * SCALE);
    add('BR-S-09', close(calc, tax) ? 'pass' : 'fail', 'rate', {
      rate: v.rate,
      taxable: fmt(taxable),
      actual: fmt(calc),
      expected: fmt(tax),
    });
  }
  if (profile.standard === 'peppol') {
    const ok = Boolean(inv.buyerReference || inv.orderRef);
    add('PEPPOL-EN16931-R003', ok ? 'pass' : 'fail', 'buyerRefOrOrder', { ok: ok ? '1' : '0' });
  }
  // Belgian numbers end in two check digits (97 minus the first eight digits modulo 97); a typo here routes Peppol invoices nowhere.
  const seen = new Set<string>();
  for (const party of [inv.seller, inv.buyer]) {
    const ids = [party.endpoint, ...party.ids, { value: party.legalId, scheme: '' }];
    for (const id of ids) {
      if (!id || id.scheme !== '0208' || seen.has(id.value)) continue;
      seen.add(id.value);
      const ok = beCheckDigitsValid(id.value);
      add('PEPPOL-COMMON-R043', ok ? 'pass' : 'fail', 'beEnterprise', { value: id.value, ok: ok ? '1' : '0' });
    }
    if (/^BE/i.test(party.vatId) && !seen.has(party.vatId)) {
      seen.add(party.vatId);
      const ok = beCheckDigitsValid(party.vatId);
      add('BE VAT', ok ? 'pass' : 'fail', 'beVat', { value: party.vatId, ok: ok ? '1' : '0' });
    }
  }
  for (const pm of inv.paymentMeans) {
    if (!pm.iban || !/^[A-Za-z]{2}\d{2}/.test(pm.iban.replace(/\s/g, ''))) continue;
    const ok = ibanValid(pm.iban);
    add('IBAN', ok ? 'pass' : 'fail', 'iban', { iban: pm.iban, ok: ok ? '1' : '0' });
  }
  return out;
}
