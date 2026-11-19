import { dec, fromDec, ibanValid, type CheckResult, type CheckStatus } from '../einvoice/checks.ts';
import { vatRowForRate, type KsefLang } from './codes.ts';
import type { KsefInvoice } from './parse.ts';

/*
 * Arithmetic and identifier checks that the KSeF itself does not perform: the
 * system validates the file against the XSD, but accepts wrong totals, wrong
 * VAT and mistyped NIP or account numbers of third parties.
 */

const SCALE = 1_000_000n;
const CENT = 10_000n;

/** NIP: ten digits, weights 6 5 7 2 3 4 5 6 7, sum mod 11 equals the last digit. */
export function nipValid(raw: string): boolean {
  const s = raw.replace(/[\s-]/g, '');
  if (!/^\d{10}$/.test(s)) return false;
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = w.reduce((a, x, i) => a + x * Number(s[i]), 0) % 11;
  return sum !== 10 && sum === Number(s[9]);
}

/** Polish account numbers are written as 26 digits (NRB) or as an IBAN; both share the IBAN check digits. */
export function accountValid(raw: string): boolean {
  const s = raw.replace(/\s+/g, '').toUpperCase();
  return ibanValid(/^\d{26}$/.test(s) ? `PL${s}` : s);
}

const M: Record<string, Record<KsefLang, (p: Record<string, string>) => string>> = {
  nip: {
    pl: (p) => `NIP ${p.who} ${p.nip}: suma kontrolna ${p.ok === '1' ? 'poprawna' : 'niepoprawna'}`,
    en: (p) => `${p.who} NIP ${p.nip}: check digit ${p.ok === '1' ? 'valid' : 'invalid'}`,
  },
  lines: {
    pl: (p) => `Suma wartości netto pozycji (${p.actual}) ${p.ok === '1' ? 'zgadza się' : 'nie zgadza się'} z polem ${p.field} (${p.expected})`,
    en: (p) => `Sum of line net values (${p.actual}) ${p.ok === '1' ? 'matches' : 'differs from'} ${p.field} (${p.expected})`,
  },
  rate: {
    pl: (p) => `${p.field}: ${p.base} × ${p.rate}% = ${p.actual}, wykazano ${p.expected}`,
    en: (p) => `${p.field}: ${p.base} × ${p.rate}% = ${p.actual}, stated ${p.expected}`,
  },
  total: {
    pl: (p) => `Suma netto i podatku ze wszystkich stawek = ${p.actual}, kwota należności ogółem (P_15): ${p.expected}`,
    en: (p) => `Net plus VAT over all rates = ${p.actual}, total amount due (P_15): ${p.expected}`,
  },
  account: {
    pl: (p) => `Rachunek ${p.nrb}: cyfry kontrolne ${p.ok === '1' ? 'poprawne' : 'niepoprawne'}`,
    en: (p) => `Account ${p.nrb}: check digits ${p.ok === '1' ? 'valid' : 'invalid'}`,
  },
  mpp: {
    pl: () => 'Kwota należności ogółem przekracza 15 000 zł, faktura zawiera pozycje z załącznika nr 15, ale brak adnotacji „mechanizm podzielonej płatności” (obowiązkowej przy sprzedaży na rzecz podatnika)',
    en: () => 'Total exceeds PLN 15,000 and lines are marked as annex 15 goods or services, but the split payment annotation (required on supplies to a taxpayer) is missing',
  },
  mppOk: {
    pl: () => 'Pozycje z załącznika nr 15, kwota należności ogółem powyżej 15 000 zł: faktura zawiera adnotację „mechanizm podzielonej płatności”',
    en: () => 'Annex 15 goods or services above PLN 15,000: the split payment annotation is present',
  },
};

const WHO: Record<string, Record<KsefLang, string>> = {
  seller: { pl: 'sprzedawcy', en: 'Seller' },
  buyer: { pl: 'nabywcy', en: 'Buyer' },
};

/** Candidate rates per VAT row; old 22% and 7% rates may still appear on corrections of old invoices. */
const ROW_RATES: Record<string, bigint[]> = { '1': [23n, 22n], '2': [8n, 7n], '3': [5n], '4': [4n, 3n] };

const abs = (v: bigint) => (v < 0n ? -v : v);

export function runKsefChecks(inv: KsefInvoice, lang: KsefLang): CheckResult[] {
  const out: CheckResult[] = [];
  const add = (rule: string, status: CheckStatus, key: string, p: Record<string, string> = {}) => out.push({ rule, status, message: M[key][lang](p) });
  const fmt = (v: bigint) => fromDec(v);

  for (const [who, p] of [['seller', inv.seller], ['buyer', inv.buyer]] as const) {
    if (!p.nip) continue;
    const ok = nipValid(p.nip);
    add('NIP', ok ? 'pass' : 'fail', 'nip', { who: WHO[who][lang], nip: p.nip, ok: ok ? '1' : '0' });
  }

  const rows = new Map(inv.vat.map((r) => [r.code, r]));
  // Lines of a correction may come in pairs: the state before (StanPrzed) and after; the summary holds the difference.
  const lines = inv.lines;
  // Advance and settlement invoices list the whole order in their lines while the summary covers only the advance or the remainder.
  const linesCarryTotals = inv.kind === 'VAT' || inv.kind === 'KOR' || inv.kind === 'UPR';
  const linesComplete = linesCarryTotals && lines.length > 0 && lines.every((l) => dec(l.net) !== null && vatRowForRate(l.rate, l.ossRate) !== '');
  if (linesComplete) {
    const byRow = new Map<string, { sum: bigint; n: number }>();
    for (const l of lines) {
      const row = vatRowForRate(l.rate, l.ossRate);
      const cur = byRow.get(row) ?? { sum: 0n, n: 0 };
      const v = dec(l.net)!;
      byRow.set(row, { sum: cur.sum + (l.before ? -v : v), n: cur.n + 1 });
    }
    for (const [row, { sum }] of byRow) {
      const stated = dec(rows.get(row)?.net ?? '');
      if (stated === null) continue;
      const ok = abs(sum - stated) <= CENT;
      add(`P_13_${row}`, ok ? 'pass' : 'warn', 'lines', { actual: fmt(sum), expected: fmt(stated), field: `P_13_${row}`, ok: ok ? '1' : '0' });
    }
  }

  for (const [row, rates] of Object.entries(ROW_RATES)) {
    const r = rows.get(row);
    const base = dec(r?.net ?? '');
    const tax = dec(r?.tax ?? '');
    if (!r || base === null || tax === null) continue;
    // VAT may be computed per line and then summed, so allow one grosz of rounding per line in that group.
    const n = Math.max(1, lines.filter((l) => vatRowForRate(l.rate, l.ossRate) === row).length);
    const tolerance = CENT * BigInt(n);
    const calc = rates.map((rate) => ({ rate, value: (base * rate) / 100n }));
    const best = calc.reduce((a, b) => (abs(b.value - tax) < abs(a.value - tax) ? b : a));
    const ok = abs(best.value - tax) <= tolerance;
    add(`P_14_${row}`, ok ? 'pass' : 'fail', 'rate', { field: `P_14_${row}`, base: fmt(base), rate: String(best.rate), actual: fmt(best.value), expected: fmt(tax) });
  }

  const total = dec(inv.total);
  if (total !== null && inv.vat.length) {
    const sum = inv.vat.reduce((a, r) => a + (dec(r.net) ?? 0n) + (dec(r.tax) ?? 0n), 0n);
    const ok = abs(sum - total) <= CENT;
    add('P_15', ok ? 'pass' : 'fail', 'total', { actual: fmt(sum), expected: fmt(total) });
  }

  const totalPln = inv.currency === 'PLN' ? total : null;
  if (totalPln !== null && totalPln > 15_000n * SCALE && lines.some((l) => l.annex15)) {
    add('P_18A', inv.annotations.splitPayment ? 'pass' : 'warn', inv.annotations.splitPayment ? 'mppOk' : 'mpp');
  }

  for (const a of inv.payment?.accounts ?? []) {
    const s = a.nrb.replace(/\s+/g, '');
    // Foreign account formats without IBAN structure cannot be checked.
    if (!/^(\d{26}|[A-Z]{2}\d{2}[A-Z0-9]{10,30})$/i.test(s)) continue;
    const ok = accountValid(s);
    add('NRB', ok ? 'pass' : 'fail', 'account', { nrb: a.nrb, ok: ok ? '1' : '0' });
  }
  return out;
}
