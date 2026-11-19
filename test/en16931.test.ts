import { describe, expect, test } from 'vitest';
import { beCheckDigitsValid, ibanValid, runChecks } from '../src/einvoice/checks.ts';
import { describeProfile, parseEInvoice, UnsupportedFormatError } from '../src/einvoice/detect.ts';
import { pickInvoiceXml } from '../src/einvoice/hybrid.ts';
import { RULE_TEXTS } from '../src/einvoice/rule-texts.ts';
import { RULE_TEXTS_FR } from '../src/einvoice/rule-texts-fr.ts';
import { coveredRules } from '../src/einvoice/rules.ts';
import { checkInvoice, detectFormat, readInvoice, UnknownFormatError, validateEn16931 } from '../src/read.ts';
import { parser, sample, sampleBytes } from './helpers.ts';

describe('profile detection', () => {
  test.each([
    ['urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0', 'xrechnung', true],
    ['urn:factur-x.eu:1p0:minimum', 'facturx', false],
    ['urn:factur-x.eu:1p0:basicwl', 'facturx', false],
    ['urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic', 'facturx', true],
    ['urn:ferd:CrossIndustryDocument:invoice:1p0:basic', 'zugferd', false],
    ['urn:cen.eu:en16931:2017', 'en16931', true],
    ['urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0', 'peppol', true],
  ] as const)('%s', (id, standard, full) => {
    const p = describeProfile(id);
    expect(p.standard).toBe(standard);
    expect(p.meetsEn16931).toBe(full);
  });
});

describe('XRechnung UBL sample', () => {
  test('parses and passes every plausibility check', () => {
    const inv = parseEInvoice(sample('xrechnung-beispiel.xml'), parser);
    expect(inv.syntax).toBe('UBL');
    expect(inv.number).toBe('RE-2026-0418');
    expect(inv.buyerReference).toBe('04011000-1234512345-06');
    expect(inv.lines).toHaveLength(3);
    expect(runChecks(inv, 'de').filter((c) => c.status !== 'pass')).toEqual([]);
  });

  test('a tampered total is reported', () => {
    const xml = sample('xrechnung-beispiel.xml').replace(
      '<cbc:PayableAmount currencyID="EUR">410.55</cbc:PayableAmount>',
      '<cbc:PayableAmount currencyID="EUR">401.55</cbc:PayableAmount>',
    );
    const failed = runChecks(parseEInvoice(xml, parser), 'en').filter((c) => c.status === 'fail');
    expect(failed.map((c) => c.rule)).toEqual(['BR-CO-16']);
  });

  test('a wrong IBAN check digit is reported', () => {
    const xml = sample('xrechnung-beispiel.xml').replace('DE89370400440532013000', 'DE88370400440532013000');
    const failed = runChecks(parseEInvoice(xml, parser), 'en').filter((c) => c.status === 'fail');
    expect(failed.map((c) => c.rule)).toEqual(['IBAN']);
  });
});

describe('Peppol BIS samples', () => {
  for (const [name, number, payable] of [
    ['peppol-factuur-voorbeeld.xml', 'F2026-0418', '826.20'],
    ['facture-peppol-exemple.xml', 'F2026-0419', '826.20'],
  ]) {
    test(name, () => {
      const inv = parseEInvoice(sample(name), parser);
      expect(inv.number).toBe(number);
      expect(inv.totals.payable).toBe(payable);
      expect(inv.vat.map((v) => v.rate)).toEqual(['21', '6']);
      expect(inv.attachments[0].mimeCode).toBe('application/pdf');
      expect(atob(inv.attachments[0].base64.slice(0, 8)).startsWith('%PDF')).toBe(true);
      const results = runChecks(inv, 'nl');
      expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
      expect(results.map((r) => r.rule)).toEqual(
        expect.arrayContaining(['PEPPOL-EN16931-R001', 'PEPPOL-EN16931-R010', 'PEPPOL-EN16931-R020', 'PEPPOL-EN16931-R003', 'PEPPOL-COMMON-R043', 'BE VAT', 'IBAN']),
      );
    });
  }

  const wrapped = () => {
    const inner = sample('peppol-factuur-voorbeeld.xml').replace(/^<\?xml[^>]*\?>\s*/, '');
    return `<?xml version="1.0" encoding="UTF-8"?>
<StandardBusinessDocument xmlns="http://www.unece.org/cefact/namespaces/StandardBusinessDocumentHeader">
  <StandardBusinessDocumentHeader><HeaderVersion>1.0</HeaderVersion></StandardBusinessDocumentHeader>
  ${inner}
</StandardBusinessDocument>`;
  };

  test('an SBDH envelope around the invoice is unwrapped', () => {
    const inv = parseEInvoice(wrapped(), parser);
    expect(inv.number).toBe('F2026-0418');
    expect(inv.lines).toHaveLength(4);
    expect(detectFormat(wrapped(), { parser })).toBe('ubl');
  });

  test('the business rules refuse an SBDH envelope instead of reading the wrong element', () => {
    expect(() => validateEn16931(wrapped(), { parser })).toThrow(UnknownFormatError);
  });

  test('an SBDH envelope without an invoice is unsupported', () => {
    expect(() => parseEInvoice('<StandardBusinessDocument xmlns="http://www.unece.org/cefact/namespaces/StandardBusinessDocumentHeader"/>', parser)).toThrow(UnsupportedFormatError);
  });

  test('a mistyped Belgian enterprise number is caught', () => {
    const inv = parseEInvoice(sample('peppol-factuur-voorbeeld.xml').replaceAll('0765432146', '0765432147'), parser);
    const fails = runChecks(inv, 'fr').filter((r) => r.status === 'fail');
    expect(fails.map((r) => r.rule)).toEqual(['PEPPOL-COMMON-R043', 'BE VAT']);
    expect(fails[0].message).toContain('Numéro d’entreprise');
  });
});

describe('identifiers', () => {
  test('Belgian enterprise and VAT numbers', () => {
    expect(beCheckDigitsValid('0123456749')).toBe(true);
    expect(beCheckDigitsValid('BE0123.456.749')).toBe(true);
    expect(beCheckDigitsValid('BE0214168947')).toBe(false);
  });
  test('IBAN', () => {
    expect(ibanValid('DE89 3704 0044 0532 0130 00')).toBe(true);
    expect(ibanValid('DE88370400440532013000')).toBe(false);
  });
});

describe('business rules (validateEn16931)', () => {
  const xr = sample('xrechnung-beispiel.xml');
  const failed = (xml: string, lang: 'de' | 'en' | 'fr' = 'de') => validateEn16931(xml, { parser, lang }).findings.filter((f) => f.status === 'fail').map((f) => f.rule);
  const warned = (xml: string) => validateEn16931(xml, { parser }).findings.filter((f) => f.status === 'warn').map((f) => f.rule);

  test('the synthetic XRechnung sample has no errors and no warnings', () => {
    const r = validateEn16931(xr, { parser });
    expect(r.findings.filter((f) => f.status !== 'pass')).toEqual([]);
    expect(r.isXRechnung).toBe(true);
    expect(r.findings.length).toBeGreaterThan(70);
    expect(r.invoice.number).toBe('RE-2026-0418');
  });

  test('bytes are accepted as well as text', () => {
    expect(validateEn16931(sampleBytes('xrechnung-beispiel.xml'), { parser }).invoice.number).toBe('RE-2026-0418');
  });

  test('every finding carries an explanation and a fix in German and English', () => {
    for (const lang of ['de', 'en'] as const) {
      for (const f of validateEn16931(xr, { parser, lang }).findings) {
        expect(f.message.length, f.rule).toBeGreaterThan(15);
        expect(f.fix.length, f.rule).toBeGreaterThan(5);
      }
    }
    expect(coveredRules().length).toBe(Object.keys(RULE_TEXTS).length);
  });

  const cases: [string, (s: string) => string, string][] = [
    ['amount due changed', (s) => s.replace('<cbc:PayableAmount currencyID="EUR">410.55', '<cbc:PayableAmount currencyID="EUR">400.00'), 'BR-CO-16'],
    ['gross total changed', (s) => s.replace('<cbc:TaxInclusiveAmount currencyID="EUR">410.55', '<cbc:TaxInclusiveAmount currencyID="EUR">411.55'), 'BR-CO-15'],
    ['line amount changed', (s) => s.replace('<cbc:LineExtensionAmount currencyID="EUR">60.00', '<cbc:LineExtensionAmount currencyID="EUR">61.00'), 'BR-CO-10'],
    ['Leitweg-ID removed', (s) => s.replace(/<cbc:BuyerReference>.*<\/cbc:BuyerReference>\n/, ''), 'BR-DE-15'],
    ['seller e-mail removed', (s) => s.replace(/<cbc:ElectronicMail>buchhaltung.*<\/cbc:ElectronicMail>/, ''), 'BR-DE-7'],
    ['unit as text', (s) => s.replace('unitCode="HUR"', 'unitCode="Std"'), 'BR-CL-23'],
    ['VAT ID without country', (s) => s.replace('<cbc:CompanyID>DE123456789</cbc:CompanyID>', '<cbc:CompanyID>123456789</cbc:CompanyID>'), 'BR-CO-09'],
    ['currency unknown', (s) => s.replace('<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>', '<cbc:DocumentCurrencyCode>EURO</cbc:DocumentCurrencyCode>'), 'BR-CL-04'],
    ['Skonto malformed', (s) => s.replace('<cbc:Note>Zahlbar innerhalb', '<cbc:Note>#SKONTO#TAGE=14#PROZENT=2#\nZahlbar innerhalb'), 'BR-DE-18'],
    ['negative price', (s) => s.replace('<cbc:PriceAmount currencyID="EUR">65.00', '<cbc:PriceAmount currencyID="EUR">-65.00'), 'BR-27'],
    ['three decimals in a total', (s) => s.replace('<cbc:TaxExclusiveAmount currencyID="EUR">345.00', '<cbc:TaxExclusiveAmount currencyID="EUR">345.001'), 'BR-DEC-12'],
    ['VAT breakdown removed', (s) => s.replace(/<cac:TaxTotal>[\s\S]*<\/cac:TaxTotal>/, ''), 'BR-CO-18'],
    ['period reversed', (s) => s.replace('<cbc:StartDate>2026-10-01', '<cbc:StartDate>2026-11-15'), 'BR-29'],
    ['payment means unknown', (s) => s.replace('<cbc:PaymentMeansCode>58', '<cbc:PaymentMeansCode>99'), 'BR-CL-16'],
    ['IBAN missing for transfer', (s) => s.replace('<cbc:ID>DE89370400440532013000</cbc:ID>', ''), 'BR-61'],
    ['reverse charge without reason', (s) => s.replaceAll('<cbc:ID>S</cbc:ID>\n        <cbc:Percent>19</cbc:Percent>', '<cbc:ID>AE</cbc:ID>\n        <cbc:Percent>0</cbc:Percent>'), 'BR-AE-10'],
    ['zero-rated breakdown with tax', (s) => s.replaceAll('<cbc:ID>S</cbc:ID>', '<cbc:ID>Z</cbc:ID>'), 'BR-Z-05'],
  ];
  for (const [name, mutate, rule] of cases) {
    test(`${name} → ${rule}`, () => {
      const xml = mutate(xr);
      expect(xml).not.toBe(xr);
      expect(failed(xml)).toContain(rule);
    });
  }

  test('a corrected invoice without a reference is a warning (BR-DE-26)', () => {
    const xml = xr.replace('<cbc:InvoiceTypeCode>380', '<cbc:InvoiceTypeCode>384');
    expect(warned(xml)).toContain('BR-DE-26');
    expect(failed(xml)).toEqual([]);
  });

  test('an order is not an invoice', () => {
    expect(() => validateEn16931('<Order xmlns="urn:oasis:names:specification:ubl:schema:xsd:Order-2"><ID>1</ID></Order>', { parser })).toThrow(UnknownFormatError);
  });

  test('French (France) wording: every rule has a text, typeset with no-break spaces', () => {
    expect(Object.keys(RULE_TEXTS_FR).sort()).toEqual(Object.keys(RULE_TEXTS).sort());
    for (const [id, [msg, fix]] of Object.entries(RULE_TEXTS_FR)) {
      expect(msg.length, id).toBeGreaterThan(10);
      expect(`${msg} ${fix}`, id).not.toMatch(/ [:;?!»]|« /);
    }
  });

  test('the French Factur-X (CII) samples', () => {
    expect(failed(sample('facture-exemple.xml'), 'fr')).toEqual([]);
    const r = validateEn16931(sample('facture-avec-erreurs.xml'), { parser, lang: 'fr' });
    expect(r.findings.filter((f) => f.status === 'fail').map((f) => f.rule)).toEqual(['BR-CO-15', 'BR-CO-16', 'IBAN']);
    const f = r.findings.find((x) => x.rule === 'BR-CO-15')!;
    expect(f.message).toBe('Montant TTC = montant hors TVA + TVA.');
    expect(f.detail).toBe('Hors TVA + TVA = 360.00, total TTC indiqué\u00a0: 370.00');
  });

  test('the deliberately broken German sample fails', () => {
    expect(failed(sample('xrechnung-fehlerhaft.xml')).length).toBeGreaterThan(0);
  });
});

describe('high-level API', () => {
  test.each([
    ['xrechnung-beispiel.xml', 'ubl'],
    ['peppol-factuur-voorbeeld.xml', 'ubl'],
    ['facture-exemple.xml', 'cii'],
    ['fattura-esempio.xml', 'fatturapa'],
    ['facturae-ejemplo.xml', 'facturae'],
    ['facturae-ejemplo.xsig', 'facturae'],
    ['faktura-ksef-przyklad.xml', 'ksef'],
  ])('%s is detected as %s and passes its checks', (name, format) => {
    expect(detectFormat(sampleBytes(name), { parser })).toBe(format);
    const result = readInvoice(sampleBytes(name), { parser });
    expect(result.format).toBe(format);
    expect(checkInvoice(result).filter((c) => c.status === 'fail')).toEqual([]);
  });

  test('profile is reported for UBL/CII', () => {
    const r = readInvoice(sample('xrechnung-beispiel.xml'), { parser });
    expect(r.format === 'ubl' && r.profile.standard).toBe('xrechnung');
  });

  test('an unknown XML document', () => {
    expect(detectFormat('<foo/>', { parser })).toBe('unknown');
    expect(() => readInvoice('<foo/>', { parser })).toThrow(UnknownFormatError);
  });

  test('malformed XML', () => {
    expect(() => readInvoice('<Invoice>', { parser })).toThrow();
  });

  test('without a DOMParser in Node.js the error says what to do', () => {
    expect(() => readInvoice('<foo/>')).toThrow(/xmldom/);
  });

  test('hybrid PDF attachment names', () => {
    expect(pickInvoiceXml([{ filename: 'logo.xml' }, { filename: 'Factur-X.xml' }])?.filename).toBe('Factur-X.xml');
    expect(pickInvoiceXml([{ filename: 'ZUGFeRD-invoice.xml' }])?.filename).toBe('ZUGFeRD-invoice.xml');
    expect(pickInvoiceXml([{ filename: 'a.pdf' }])).toBeNull();
  });
});
