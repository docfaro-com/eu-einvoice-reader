import { dec, fromDec, ibanValid, type CheckResult, type CheckStatus } from '../einvoice/checks.ts';
import type { Facturae, FeInvoice, FeParty, FeTax } from './parse.ts';
import { checkNif } from './nif.ts';
import { fullNumber } from './parse.ts';

/*
 * The arithmetic the Facturae XSD documents for its totals (e.g. InvoiceTotal = TotalGrossAmountBeforeTaxes +
 * TotalTaxOutputs - TotalTaxesWithheld), the check characters of Spanish NIFs and IBANs, and the three DIR3 units FACe
 * needs for invoices to public bodies (Orden HAP/1074/2014). A plausibility pre-check, not a validation against the
 * XSD or by FACe.
 */

export type FeCheckLang = 'es' | 'en';

const SCALE = 1_000_000n;
const CENT = 10_000n;

type Params = Record<string, string>;
const M: Record<string, Record<FeCheckLang, (p: Params) => string>> = {
  cost: {
    es: (p) => (p.ok ? `Coste total de ${p.n} línea(s) = cantidad × precio unitario` : `Línea ${p.line}: coste total ${p.expected}, pero cantidad × precio da ${p.actual}`),
    en: (p) => (p.ok ? `Total cost of ${p.n} line(s) = quantity × unit price` : `Line ${p.line}: total cost ${p.expected}, but quantity × price gives ${p.actual}`),
  },
  gross: {
    es: (p) => (p.ok ? `Importe bruto de ${p.n} línea(s) = coste − descuentos + cargos` : `Línea ${p.line}: importe bruto ${p.expected}, pero coste − descuentos + cargos da ${p.actual}`),
    en: (p) => (p.ok ? `Gross amount of ${p.n} line(s) = cost − discounts + charges` : `Line ${p.line}: gross amount ${p.expected}, but cost − discounts + charges gives ${p.actual}`),
  },
  totalGross: {
    es: (p) => `Total importe bruto ${p.expected}${p.ok ? ' = suma de las líneas' : `, pero las líneas suman ${p.actual}`}`,
    en: (p) => `Total gross amount ${p.expected}${p.ok ? ' = sum of the lines' : `, but the lines add up to ${p.actual}`}`,
  },
  beforeTaxes: {
    es: (p) => `Base antes de impuestos ${p.expected}${p.ok ? ' = bruto − descuentos generales + cargos generales' : `, pero el cálculo da ${p.actual}`}`,
    en: (p) => `Total before taxes ${p.expected}${p.ok ? ' = gross − general discounts + general charges' : `, but the calculation gives ${p.actual}`}`,
  },
  rate: {
    es: (p) => `${p.tax} ${p.rate} % sobre ${p.base}: cuota ${p.expected}${p.ok ? '' : `, calculada ${p.actual}`}`,
    en: (p) => `${p.tax} ${p.rate}% on ${p.base}: amount ${p.expected}${p.ok ? '' : `, calculated ${p.actual}`}`,
  },
  surcharge: {
    es: (p) => `Recargo de equivalencia ${p.rate} % sobre ${p.base}: ${p.expected}${p.ok ? '' : `, calculado ${p.actual}`}`,
    en: (p) => `Equivalence surcharge ${p.rate}% on ${p.base}: ${p.expected}${p.ok ? '' : `, calculated ${p.actual}`}`,
  },
  taxOutputs: {
    es: (p) => `Total impuestos repercutidos ${p.expected}${p.ok ? ' = suma de cuotas y recargos' : `, pero las cuotas suman ${p.actual}`}`,
    en: (p) => `Total output tax ${p.expected}${p.ok ? ' = sum of tax and surcharge amounts' : `, but the amounts add up to ${p.actual}`}`,
  },
  withheld: {
    es: (p) => `Total retenciones ${p.expected}${p.ok ? ' = suma de las retenciones' : `, pero las retenciones suman ${p.actual}`}`,
    en: (p) => `Total withheld ${p.expected}${p.ok ? ' = sum of the withholdings' : `, but the withholdings add up to ${p.actual}`}`,
  },
  invoiceTotal: {
    es: (p) => `Total factura ${p.expected}${p.ok ? ' = base + impuestos repercutidos − retenciones' : `, pero base + impuestos − retenciones da ${p.actual}`}`,
    en: (p) => `Invoice total ${p.expected}${p.ok ? ' = base + output tax − withholdings' : `, but base + tax − withholdings gives ${p.actual}`}`,
  },
  outstanding: {
    es: (p) => `Total a pagar ${p.expected}${p.ok ? ' = total factura − subvenciones − anticipos' : `, pero el cálculo da ${p.actual}`}`,
    en: (p) => `Total outstanding ${p.expected}${p.ok ? ' = invoice total − subsidies − payments on account' : `, but the calculation gives ${p.actual}`}`,
  },
  executable: {
    es: (p) => `Total a ejecutar ${p.expected}${p.ok ? ' = total a pagar − cantidades retenidas − pagos en especie + suplidos + gastos financieros' : `, pero el cálculo da ${p.actual}`}`,
    en: (p) => `Total executable ${p.expected}${p.ok ? ' = outstanding − amounts withheld − payment in kind + reimbursable and financial expenses' : `, but the calculation gives ${p.actual}`}`,
  },
  installments: {
    es: (p) => `Vencimientos: suman ${p.actual}${p.ok ? ', igual que el total a ejecutar' : `, el total a ejecutar es ${p.expected}`}`,
    en: (p) => `Instalments add up to ${p.actual}${p.ok ? ', the same as the executable total' : `; the executable total is ${p.expected}`}`,
  },
  batchCount: {
    es: (p) => `El lote declara ${p.expected} factura(s)${p.ok ? '' : `, pero el archivo contiene ${p.actual}`}`,
    en: (p) => `The batch declares ${p.expected} invoice(s)${p.ok ? '' : `, but the file holds ${p.actual}`}`,
  },
  batchTotal: {
    es: (p) => `Cabecera del lote, ${p.field}: ${p.expected}${p.ok ? ' = suma de las facturas' : `, pero las facturas suman ${p.actual}`}`,
    en: (p) => `Batch header, ${p.field}: ${p.expected}${p.ok ? ' = sum of the invoices' : `, but the invoices add up to ${p.actual}`}`,
  },
  nif: {
    es: (p) => `NIF ${p.who} ${p.value}: ${p.ok ? 'carácter de control correcto' : p.kind ? 'carácter de control incorrecto' : 'formato no reconocido'}`,
    en: (p) => `Tax ID (NIF) of the ${p.who} ${p.value}: ${p.ok ? 'check character valid' : p.kind ? 'check character invalid' : 'format not recognised'}`,
  },
  iban: {
    es: (p) => `IBAN ${p.iban}: dígitos de control ${p.ok ? 'correctos' : 'incorrectos'}`,
    en: (p) => `IBAN ${p.iban}: check digits ${p.ok ? 'valid' : 'invalid'}`,
  },
  dir3: {
    es: (p) => (p.ok ? 'Códigos DIR3 de oficina contable, órgano gestor y unidad tramitadora presentes' : `Falta(n) en el cliente: ${p.missing}. FACe exige los tres códigos DIR3`),
    en: (p) => (p.ok ? 'DIR3 codes for accounting office, managing body and processing unit present' : `Missing for the buyer: ${p.missing}. FACe requires all three DIR3 codes`),
  },
  corrective: {
    es: (p) => (p.ok ? `Factura rectificativa: identifica la factura ${p.ref}` : 'La clase de factura es rectificativa, pero falta el bloque Corrective con la factura rectificada'),
    en: (p) => (p.ok ? `Corrective invoice: refers to invoice ${p.ref}` : 'The invoice class is corrective, but the Corrective block naming the corrected invoice is missing'),
  },
};

const WHO: Record<string, Record<FeCheckLang, string>> = {
  seller: { es: 'del emisor', en: 'seller' },
  buyer: { es: 'del cliente', en: 'buyer' },
  third: { es: 'del tercero', en: 'third party' },
};
const UNITS_MISSING: Record<string, Record<FeCheckLang, string>> = {
  '01': { es: 'oficina contable (01)', en: 'accounting office (01)' },
  '02': { es: 'órgano gestor (02)', en: 'managing body (02)' },
  '03': { es: 'unidad tramitadora (03)', en: 'processing unit (03)' },
};
const BATCH_FIELDS: Record<string, Record<FeCheckLang, string>> = {
  totalInvoices: { es: 'total facturas', en: 'total invoices' },
  totalOutstanding: { es: 'total a pagar', en: 'total outstanding' },
  totalExecutable: { es: 'total a ejecutar', en: 'total executable' },
};
const TAX_NAMES: Record<string, string> = { '01': 'IVA', '02': 'IPSI', '03': 'IGIC', '04': 'IRPF' };

const fmt = (v: bigint) => fromDec(v);
const abs = (v: bigint) => (v < 0n ? -v : v);
const sum = (xs: string[]) => xs.reduce((a, x) => a + (dec(x) ?? 0n), 0n);
const mul = (a: bigint, b: bigint) => (a * b) / SCALE;

export function checkFacturae(fe: Facturae, lang: FeCheckLang): CheckResult[] {
  const out: CheckResult[] = [];
  const many = fe.invoices.length > 1;
  const add = (rule: string, ok: boolean, key: string, p: Params, inv?: FeInvoice, warnOnly = false) => {
    const status: CheckStatus = ok ? 'pass' : warnOnly ? 'warn' : 'fail';
    const prefix = many && inv ? `${fullNumber(inv)}: ` : '';
    out.push({ rule, status, message: prefix + M[key][lang]({ ...p, ok: ok ? '1' : '' }) });
  };
  /** Compares a stated amount with a calculated one; values of up to 8 decimals are rounded independently, hence the tolerance. */
  const compare = (rule: string, key: string, stated: string, calc: bigint, inv: FeInvoice, tolerance = CENT, extra: Params = {}) => {
    const s = dec(stated);
    if (s === null) return;
    add(rule, abs(s - calc) <= tolerance, key, { expected: fmt(s), actual: fmt(calc), ...extra }, inv);
  };

  for (const inv of fe.invoices) {
    const t = inv.totals;
    const badCost: Params[] = [];
    const badGross: Params[] = [];
    inv.lines.forEach((l, i) => {
      const q = dec(l.quantity);
      const price = dec(l.unitPrice);
      const cost = dec(l.totalCost);
      if (q !== null && price !== null && cost !== null && abs(mul(q, price) - cost) > CENT) badCost.push({ line: String(i + 1), expected: fmt(cost), actual: fmt(mul(q, price)) });
      const gross = dec(l.gross);
      if (cost !== null && gross !== null) {
        const calc = cost - sum(l.discounts.map((d) => d.amount)) + sum(l.charges.map((c) => c.amount));
        if (abs(calc - gross) > CENT) badGross.push({ line: String(i + 1), expected: fmt(gross), actual: fmt(calc) });
      }
    });
    const n = String(inv.lines.length);
    if (badCost.length) for (const p of badCost) add('FE-COST', false, 'cost', p, inv);
    else if (inv.lines.length) add('FE-COST', true, 'cost', { n }, inv);
    if (badGross.length) for (const p of badGross) add('FE-GROSS', false, 'gross', p, inv);
    else if (inv.lines.length) add('FE-GROSS', true, 'gross', { n }, inv);

    compare('FE-TOTAL-GROSS', 'totalGross', t.gross, sum(inv.lines.map((l) => l.gross)), inv);
    const discounts = t.totalDiscounts ? dec(t.totalDiscounts) ?? 0n : sum(t.generalDiscounts.map((d) => d.amount));
    const charges = t.totalCharges ? dec(t.totalCharges) ?? 0n : sum(t.generalCharges.map((c) => c.amount));
    compare('FE-BEFORE-TAXES', 'beforeTaxes', t.beforeTaxes, (dec(t.gross) ?? 0n) - discounts + charges, inv);

    // Invoice-level taxes summarise lines that were each rounded to cents, so allow half a cent per line.
    const lineTolerance = CENT > (BigInt(inv.lines.length) * CENT) / 2n ? CENT : (BigInt(inv.lines.length) * CENT) / 2n;
    const rateCheck = (taxesList: FeTax[], rule: string) => {
      for (const tax of taxesList) {
        const base = dec(tax.base);
        const rate = dec(tax.rate);
        const amt = dec(tax.amount);
        if (base === null || rate === null || amt === null) continue;
        const calc = (base * rate) / (100n * SCALE);
        add(rule, abs(calc - amt) <= lineTolerance, 'rate', { tax: TAX_NAMES[tax.type] ?? tax.type, rate: tax.rate.replace(/\.?0+$/, ''), base: fmt(base), expected: fmt(amt), actual: fmt(calc) }, inv);
        const sr = dec(tax.surchargeRate);
        const sa = dec(tax.surchargeAmount);
        if (sr !== null && sa !== null) {
          const sc = (base * sr) / (100n * SCALE);
          add('FE-SURCHARGE', abs(sc - sa) <= lineTolerance, 'surcharge', { rate: tax.surchargeRate.replace(/\.?0+$/, ''), base: fmt(base), expected: fmt(sa), actual: fmt(sc) }, inv);
        }
      }
    };
    rateCheck(inv.taxes, 'FE-TAX-RATE');
    rateCheck(inv.withheld, 'FE-WITHHELD-RATE');
    compare('FE-TAX-OUTPUTS', 'taxOutputs', t.taxOutputs, sum(inv.taxes.map((x) => x.amount)) + sum(inv.taxes.map((x) => x.surchargeAmount)), inv);
    if (inv.withheld.length || (dec(t.taxesWithheld) ?? 0n) !== 0n) compare('FE-WITHHELD', 'withheld', t.taxesWithheld, sum(inv.withheld.map((x) => x.amount)), inv);
    compare('FE-INVOICE-TOTAL', 'invoiceTotal', t.invoiceTotal, (dec(t.beforeTaxes) ?? 0n) + (dec(t.taxOutputs) ?? 0n) - (dec(t.taxesWithheld) ?? 0n), inv);
    const prepaid = t.totalPaymentsOnAccount ? dec(t.totalPaymentsOnAccount) ?? 0n : sum(t.paymentsOnAccount.map((p) => p.amount));
    compare('FE-OUTSTANDING', 'outstanding', t.outstanding, (dec(t.invoiceTotal) ?? 0n) - sum(t.subsidies.map((s) => s.amount)) - prepaid, inv);
    const reimbursable = t.totalReimbursable ? dec(t.totalReimbursable) ?? 0n : sum(t.reimbursable);
    compare(
      'FE-EXECUTABLE',
      'executable',
      t.executable,
      (dec(t.outstanding) ?? 0n) - (dec(t.amountsWithheld?.amount ?? '') ?? 0n) - (dec(t.paymentInKind?.amount ?? '') ?? 0n) + reimbursable + (dec(t.financialExpenses) ?? 0n),
      inv,
    );
    if (inv.installments.length && dec(t.executable) !== null) {
      const s = sum(inv.installments.map((i) => i.amount));
      const e = dec(t.executable)!;
      add('FE-INSTALLMENTS', abs(s - e) <= CENT, 'installments', { actual: fmt(s), expected: fmt(e) }, inv, true);
    }
    const isCorrective = inv.invoiceClass === 'OR' || inv.invoiceClass === 'CR';
    if (isCorrective || inv.corrective) {
      const ref = inv.corrective ? `${inv.corrective.series}${inv.corrective.number}` : '';
      add('FE-CORRECTIVE', Boolean(inv.corrective && (inv.corrective.number || inv.corrective.series)), 'corrective', { ref }, inv, !isCorrective);
    }
    const seen = new Set<string>();
    for (const i of inv.installments) {
      for (const iban of [i.iban, i.debitIban]) {
        if (!iban || seen.has(iban) || !/^[A-Za-z]{2}\d{2}/.test(iban.replace(/\s/g, ''))) continue;
        seen.add(iban);
        add('IBAN', ibanValid(iban), 'iban', { iban }, inv);
      }
    }
  }

  if (fe.invoices.length) {
    const count = Number(fe.batch.count);
    if (fe.batch.count) add('FE-BATCH-COUNT', count === fe.invoices.length, 'batchCount', { expected: fe.batch.count, actual: String(fe.invoices.length) });
    const fields: [keyof Facturae['batch'], (i: FeInvoice) => string][] = [
      ['totalInvoices', (i) => i.totals.invoiceTotal],
      ['totalOutstanding', (i) => i.totals.outstanding],
      ['totalExecutable', (i) => i.totals.executable],
    ];
    for (const [field, pick] of fields) {
      const stated = dec(fe.batch[field]);
      if (stated === null) continue;
      const calc = sum(fe.invoices.map(pick));
      add('FE-BATCH-TOTAL', abs(stated - calc) <= CENT, 'batchTotal', { field: BATCH_FIELDS[field][lang], expected: fmt(stated), actual: fmt(calc) });
    }
  }

  const nifCheck = (p: FeParty | null, who: string) => {
    // Only Spanish residents carry a Spanish NIF; EU and foreign parties use their own identifiers.
    if (!p?.taxId || (p.residence && p.residence !== 'R')) return;
    const r = checkNif(p.taxId);
    out.push({ rule: 'NIF', status: r.valid ? 'pass' : 'fail', message: M.nif[lang]({ who: WHO[who][lang], value: p.taxId, ok: r.valid ? '1' : '', kind: r.kind ?? '' }) });
  };
  nifCheck(fe.seller, 'seller');
  nifCheck(fe.buyer, 'buyer');
  nifCheck(fe.thirdParty, 'third');

  if (fe.buyer.centres.length) {
    const missing = ['01', '02', '03'].filter((role) => !fe.buyer.centres.some((c) => c.role === role && c.code));
    out.push({
      rule: 'FACe DIR3',
      status: missing.length ? 'warn' : 'pass',
      message: M.dir3[lang]({ ok: missing.length ? '' : '1', missing: missing.map((m) => UNITS_MISSING[m][lang]).join(', ') }),
    });
  }
  return out;
}
