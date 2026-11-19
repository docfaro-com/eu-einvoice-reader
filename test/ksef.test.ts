import { describe, expect, test } from 'vitest';
import { accountValid, nipValid, runKsefChecks } from '../src/ksef/checks.ts';
import { vatRowForRate } from '../src/ksef/codes.ts';
import { ksefNumberFromFileName, NotKsefError, parseKsef } from '../src/ksef/parse.ts';
import { base64Url, kodIUrl, sha256Base64Url } from '../src/ksef/qr.ts';
import { parser, sample } from './helpers.ts';

describe('synthetic KSeF sample', () => {
  const inv = parseKsef(sample('faktura-ksef-przyklad.xml'), parser);
  test('header, parties and totals', () => {
    expect(inv.variant).toBe('FA (3)');
    expect(inv.number).toBe('FV/2026/11/042');
    expect(inv.issueDate).toBe('2026-11-03');
    expect(inv.seller.nip).toBe('1234563218');
    expect(inv.buyer.name).toBe('Biuro Rachunkowe Kowalska sp. z o.o.');
    expect(inv.total).toBe('1998.00');
    expect(inv.vat.map((r) => r.code)).toEqual(['1', '3']);
    expect(inv.lines).toHaveLength(4);
    expect(inv.lines[3].cn).toBe('4901 99 00');
    expect(inv.payment?.accounts[0].nrb).toBe('61109010140000071219812874');
    expect(inv.conditions?.orders[0].number).toBe('ZAM/2026/117');
    expect(inv.footer.registers[0].krs).toBe('0000123456');
  });
  test('every check passes', () => {
    const results = runKsefChecks(inv, 'pl');
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
    expect(results.map((r) => r.rule)).toEqual(expect.arrayContaining(['NIP', 'P_13_1', 'P_13_3', 'P_14_1', 'P_14_3', 'P_15', 'NRB']));
  });
  test('a tampered total and VAT amount are caught', () => {
    const bad = parseKsef(sample('faktura-ksef-przyklad.xml').replace('<P_14_1>138.00</P_14_1>', '<P_14_1>139.00</P_14_1>'), parser);
    const fails = runKsefChecks(bad, 'en').filter((r) => r.status === 'fail').map((r) => r.rule);
    expect(fails).toEqual(['P_14_1', 'P_15']);
  });
  test('a mistyped NIP and account number are caught', () => {
    const bad = parseKsef(sample('faktura-ksef-przyklad.xml').replace('9510007773', '9510007774').replace('61109010140000071219812874', '61109010140000071219812875'), parser);
    expect(runKsefChecks(bad, 'en').filter((r) => r.status === 'fail').map((r) => r.rule)).toEqual(['NIP', 'NRB']);
  });
  test('split payment hint for annex 15 goods above PLN 15,000', () => {
    const xml = sample('faktura-ksef-przyklad.xml')
      .replace('<P_12>5</P_12>', '<P_12>5</P_12>\n      <P_12_Zal_15>1</P_12_Zal_15>')
      .replace('<P_15>1998.00</P_15>', '<P_15>19980.00</P_15>');
    const r = runKsefChecks(parseKsef(xml, parser), 'pl').find((x) => x.rule === 'P_18A');
    expect(r?.status).toBe('warn');
  });
});

describe('KSeF structure detection', () => {
  test('UBL, FatturaPA and FA(1) are rejected with the right kind', () => {
    const kindOf = (xml: string) => {
      try {
        parseKsef(xml, parser);
        return 'parsed';
      } catch (e) {
        return e instanceof NotKsefError ? e.kind : String(e);
      }
    };
    expect(kindOf(sample('xrechnung-beispiel.xml'))).toBe('ubl');
    expect(kindOf(sample('fattura-esempio.xml'))).toBe('fatturapa');
    expect(kindOf(sample('faktura-ksef-przyklad.xml').replace('FA (3)', 'FA (1)'))).toBe('fa1');
    expect(kindOf('<Faktura xmlns="x"><Naglowek><KodFormularza kodSystemowy="FA_RR (1)">FA_RR</KodFormularza></Naglowek></Faktura>')).toBe('farr');
  });
  test('KSeF number in a file name', () => {
    expect(ksefNumberFromFileName('5265877635-20250826-0100001AF629-AF.xml')).toBe('5265877635-20250826-0100001AF629-AF');
    expect(ksefNumberFromFileName('faktura.xml')).toBe('');
  });
  test('rate codes map to the VAT summary rows', () => {
    expect(['23', '8', '5', '4', '0 KR', '0 WDT', '0 EX', 'zw', 'np I', 'np II', 'oo'].map((r) => vatRowForRate(r))).toEqual([
      '1', '2', '3', '4', '6_1', '6_2', '6_3', '7', '8', '9', '10',
    ]);
    expect(vatRowForRate('20', '20')).toBe('5');
  });
});

describe('identifiers', () => {
  test('NIP check digit', () => {
    expect(nipValid('1234563218')).toBe(true);
    expect(nipValid('123-456-32-18')).toBe(true);
    expect(nipValid('1234563219')).toBe(false);
    expect(nipValid('#nip#')).toBe(false);
  });
  test('Polish NRB and IBAN', () => {
    expect(accountValid('61 1090 1014 0000 0712 1981 2874')).toBe(true);
    expect(accountValid('PL61109010140000071219812874')).toBe(true);
    expect(accountValid('61109010140000071219812875')).toBe(false);
  });
});

describe('KOD I verification link', () => {
  test('format from the Ministry documentation', () => {
    // Example values from CIRFMF/ksef-api kody-qr.md (production host instead of the test host).
    expect(kodIUrl('1111111111', '2026-02-01', 'UtQp9Gpc51y-u3xApZjIjgkpZ01js-J8KflSPW8WzIE')).toBe(
      'https://qr.ksef.mf.gov.pl/invoice/1111111111/01-02-2026/UtQp9Gpc51y-u3xApZjIjgkpZ01js-J8KflSPW8WzIE',
    );
    expect(kodIUrl('#nip#', '2026-02-01', 'x')).toBe('');
  });
  test('SHA-256 in Base64URL without padding', async () => {
    expect(await sha256Base64Url(new TextEncoder().encode('abc'))).toBe('ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0');
    expect(base64Url(new Uint8Array([251, 255]))).toBe('-_8');
  });
});
