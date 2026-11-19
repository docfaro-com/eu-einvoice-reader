import { dec, fromDec } from '../einvoice/checks.ts';
import { all, first, parseXml, rootName, text, texts, type XmlParser } from '../xml.ts';

/*
 * FatturaPA (FPA12 / FPR12) as defined by the Agenzia delle Entrate
 * "Specifiche tecniche". One file can hold several FatturaElettronicaBody
 * elements (a "lotto" of invoices for the same parties), so bodies is a list.
 */

export interface FpParty {
  vatId: string; // IdFiscaleIVA IdPaese+IdCodice
  fiscalCode: string; // CodiceFiscale
  name: string; // Denominazione, or Nome + Cognome
  title: string;
  eori: string;
  taxRegime: string; // RegimeFiscale (seller only)
  address: { street: string; number: string; cap: string; city: string; province: string; country: string };
  rea: { office: string; number: string; capital: string; soleShareholder: string; liquidation: string } | null;
  contacts: { phone: string; fax: string; email: string };
}

export interface FpLine {
  number: string;
  kind: string; // TipoCessionePrestazione
  codes: { type: string; value: string }[];
  description: string;
  quantity: string;
  unit: string;
  periodStart: string;
  periodEnd: string;
  unitPrice: string;
  discounts: { type: string; percent: string; amount: string }[];
  total: string;
  vatRate: string;
  nature: string;
  withholding: string;
  other: { type: string; text: string; number: string; date: string }[];
}

export interface FpSummary {
  vatRate: string;
  nature: string;
  incidental: string;
  rounding: string;
  taxable: string;
  tax: string;
  vatDue: string; // EsigibilitaIVA
  legalRef: string;
}

export interface FpPaymentDetail {
  beneficiary: string;
  method: string;
  dueDate: string;
  termDays: string;
  amount: string;
  bank: string;
  iban: string;
  bic: string;
  abi: string;
  cab: string;
}

export interface FpAttachment {
  name: string;
  compression: string;
  format: string;
  description: string;
  base64: string;
}

export interface FpBody {
  docType: string;
  currency: string;
  date: string;
  number: string;
  total: string; // ImportoTotaleDocumento as written, or computed
  totalIsComputed: boolean;
  /** Sum of DettaglioPagamento/ImportoPagamento: what the buyer actually pays after withholdings. */
  amountDue: string;
  rounding: string;
  reasons: string[]; // Causale
  withholdings: { type: string; amount: string; rate: string; reason: string }[];
  stamp: { virtual: string; amount: string } | null;
  pensionFunds: { type: string; rate: string; amount: string; base: string; vatRate: string; nature: string }[];
  discounts: { type: string; percent: string; amount: string }[];
  orders: { id: string; date: string; cup: string; cig: string }[];
  contracts: { id: string; date: string; cup: string; cig: string }[];
  ddt: { number: string; date: string }[];
  linkedInvoices: { id: string; date: string }[];
  lines: FpLine[];
  summary: FpSummary[];
  paymentConditions: string;
  payments: FpPaymentDetail[];
  attachments: FpAttachment[];
}

export interface FatturaPA {
  version: string; // FPA12 | FPR12
  transmission: {
    senderCountry: string;
    senderCode: string;
    progressive: string;
    format: string;
    recipientCode: string;
    recipientPec: string;
  };
  seller: FpParty;
  buyer: FpParty;
  fiscalRepresentative: { vatId: string; name: string } | null;
  issuer: string; // SoggettoEmittente: CC = cessionario, TZ = terzo
  bodies: FpBody[];
}

export class NotFatturaPAError extends Error {}

function idFiscale(el: Element | null): string {
  const country = text(el, 'IdPaese');
  const code = text(el, 'IdCodice');
  return code ? `${country}${code}` : '';
}

function anagrafica(el: Element | null): string {
  return text(el, 'Denominazione') || [text(el, 'Nome'), text(el, 'Cognome')].filter(Boolean).join(' ');
}

function party(el: Element | null): FpParty {
  const da = first(el, 'DatiAnagrafici');
  const sede = first(el, 'Sede');
  const rea = first(el, 'IscrizioneREA');
  return {
    vatId: idFiscale(first(da, 'IdFiscaleIVA')),
    fiscalCode: text(da, 'CodiceFiscale'),
    name: anagrafica(first(da, 'Anagrafica')),
    title: text(da, 'Anagrafica/Titolo'),
    eori: text(da, 'Anagrafica/CodEORI'),
    taxRegime: text(da, 'RegimeFiscale'),
    address: {
      street: text(sede, 'Indirizzo'),
      number: text(sede, 'NumeroCivico'),
      cap: text(sede, 'CAP'),
      city: text(sede, 'Comune'),
      province: text(sede, 'Provincia'),
      country: text(sede, 'Nazione'),
    },
    rea: rea
      ? {
          office: text(rea, 'Ufficio'),
          number: text(rea, 'NumeroREA'),
          capital: text(rea, 'CapitaleSociale'),
          soleShareholder: text(rea, 'SocioUnico'),
          liquidation: text(rea, 'StatoLiquidazione'),
        }
      : null,
    contacts: { phone: text(el, 'Contatti/Telefono'), fax: text(el, 'Contatti/Fax'), email: text(el, 'Contatti/Email') },
  };
}

function discounts(el: Element | null) {
  return all(el, 'ScontoMaggiorazione').map((s) => ({
    type: text(s, 'Tipo'),
    percent: text(s, 'Percentuale'),
    amount: text(s, 'Importo'),
  }));
}

function docRefs(el: Element | null, path: string) {
  return all(el, path).map((r) => ({
    id: text(r, 'IdDocumento'),
    date: text(r, 'Data'),
    cup: text(r, 'CodiceCUP'),
    cig: text(r, 'CodiceCIG'),
  }));
}

function body(b: Element): FpBody {
  const dg = first(b, 'DatiGenerali');
  const dgd = first(dg, 'DatiGeneraliDocumento');
  const dbs = first(b, 'DatiBeniServizi');
  const summary: FpSummary[] = all(dbs, 'DatiRiepilogo').map((r) => ({
    vatRate: text(r, 'AliquotaIVA'),
    nature: text(r, 'Natura'),
    incidental: text(r, 'SpeseAccessorie'),
    rounding: text(r, 'Arrotondamento'),
    taxable: text(r, 'ImponibileImporto'),
    tax: text(r, 'Imposta'),
    vatDue: text(r, 'EsigibilitaIVA'),
    legalRef: text(r, 'RiferimentoNormativo'),
  }));
  const written = text(dgd, 'ImportoTotaleDocumento');
  // ImportoTotaleDocumento is optional; fall back to taxable + VAT from the summary blocks.
  const computed = summary.reduce((acc, r) => acc + (dec(r.taxable) ?? 0n) + (dec(r.tax) ?? 0n), 0n);
  const bollo = first(dgd, 'DatiBollo');
  const pagamenti = all(b, 'DatiPagamento');
  const paymentAmounts = pagamenti.flatMap((p) => all(p, 'DettaglioPagamento/ImportoPagamento')).map((e) => dec(text(e)));
  return {
    docType: text(dgd, 'TipoDocumento'),
    currency: text(dgd, 'Divisa'),
    date: text(dgd, 'Data'),
    number: text(dgd, 'Numero'),
    total: written || (summary.length ? fromDec(computed) : ''),
    totalIsComputed: !written && summary.length > 0,
    amountDue: paymentAmounts.length ? fromDec(paymentAmounts.reduce<bigint>((a, v) => a + (v ?? 0n), 0n)) : '',
    rounding: text(dgd, 'Arrotondamento'),
    reasons: texts(dgd, 'Causale'),
    withholdings: all(dgd, 'DatiRitenuta').map((r) => ({
      type: text(r, 'TipoRitenuta'),
      amount: text(r, 'ImportoRitenuta'),
      rate: text(r, 'AliquotaRitenuta'),
      reason: text(r, 'CausalePagamento'),
    })),
    stamp: bollo ? { virtual: text(bollo, 'BolloVirtuale'), amount: text(bollo, 'ImportoBollo') } : null,
    pensionFunds: all(dgd, 'DatiCassaPrevidenziale').map((c) => ({
      type: text(c, 'TipoCassa'),
      rate: text(c, 'AlCassa'),
      amount: text(c, 'ImportoContributoCassa'),
      base: text(c, 'ImponibileCassa'),
      vatRate: text(c, 'AliquotaIVA'),
      nature: text(c, 'Natura'),
    })),
    discounts: discounts(dgd),
    orders: docRefs(dg, 'DatiOrdineAcquisto'),
    contracts: docRefs(dg, 'DatiContratto'),
    ddt: all(dg, 'DatiDDT').map((d) => ({ number: text(d, 'NumeroDDT'), date: text(d, 'DataDDT') })),
    linkedInvoices: docRefs(dg, 'DatiFattureCollegate').map((r) => ({ id: r.id, date: r.date })),
    lines: all(dbs, 'DettaglioLinee').map((l) => ({
      number: text(l, 'NumeroLinea'),
      kind: text(l, 'TipoCessionePrestazione'),
      codes: all(l, 'CodiceArticolo').map((c) => ({ type: text(c, 'CodiceTipo'), value: text(c, 'CodiceValore') })),
      description: text(l, 'Descrizione'),
      quantity: text(l, 'Quantita'),
      unit: text(l, 'UnitaMisura'),
      periodStart: text(l, 'DataInizioPeriodo'),
      periodEnd: text(l, 'DataFinePeriodo'),
      unitPrice: text(l, 'PrezzoUnitario'),
      discounts: discounts(l),
      total: text(l, 'PrezzoTotale'),
      vatRate: text(l, 'AliquotaIVA'),
      nature: text(l, 'Natura'),
      withholding: text(l, 'Ritenuta'),
      other: all(l, 'AltriDatiGestionali').map((a) => ({
        type: text(a, 'TipoDato'),
        text: text(a, 'RiferimentoTesto'),
        number: text(a, 'RiferimentoNumero'),
        date: text(a, 'RiferimentoData'),
      })),
    })),
    summary,
    paymentConditions: text(pagamenti[0] ?? null, 'CondizioniPagamento'),
    payments: pagamenti.flatMap((p) =>
      all(p, 'DettaglioPagamento').map((d) => ({
        beneficiary: text(d, 'Beneficiario'),
        method: text(d, 'ModalitaPagamento'),
        dueDate: text(d, 'DataScadenzaPagamento'),
        termDays: text(d, 'GiorniTerminiPagamento'),
        amount: text(d, 'ImportoPagamento'),
        bank: text(d, 'IstitutoFinanziario'),
        iban: text(d, 'IBAN'),
        bic: text(d, 'BIC'),
        abi: text(d, 'ABI'),
        cab: text(d, 'CAB'),
      })),
    ),
    attachments: all(b, 'Allegati').map((a) => ({
      name: text(a, 'NomeAttachment'),
      compression: text(a, 'AlgoritmoCompressione'),
      format: text(a, 'FormatoAttachment'),
      description: text(a, 'DescrizioneAttachment'),
      base64: (first(a, 'Attachment')?.textContent ?? '').replace(/\s+/g, ''),
    })),
  };
}

export function parseFatturaPA(xmlText: string, parser: XmlParser): FatturaPA {
  const doc = parseXml(xmlText, parser);
  if (rootName(doc) !== 'FatturaElettronica') throw new NotFatturaPAError(rootName(doc));
  const root = doc.documentElement;
  const h = first(root, 'FatturaElettronicaHeader');
  const dt = first(h, 'DatiTrasmissione');
  const rf = first(h, 'RappresentanteFiscale');
  return {
    version: root.getAttribute('versione') ?? '',
    transmission: {
      senderCountry: text(dt, 'IdTrasmittente/IdPaese'),
      senderCode: text(dt, 'IdTrasmittente/IdCodice'),
      progressive: text(dt, 'ProgressivoInvio'),
      format: text(dt, 'FormatoTrasmissione'),
      recipientCode: text(dt, 'CodiceDestinatario'),
      recipientPec: text(dt, 'PECDestinatario'),
    },
    seller: party(first(h, 'CedentePrestatore')),
    buyer: party(first(h, 'CessionarioCommittente')),
    fiscalRepresentative: rf
      ? { vatId: idFiscale(first(rf, 'DatiAnagrafici/IdFiscaleIVA')), name: anagrafica(first(rf, 'DatiAnagrafici/Anagrafica')) }
      : null,
    issuer: text(h, 'SoggettoEmittente'),
    bodies: all(root, 'FatturaElettronicaBody').map(body),
  };
}
