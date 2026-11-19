import { describe, expect, test } from 'vitest';
import { innerFileName, unwrapP7m } from '../src/p7m/cms.ts';
import { sampleBytes } from './helpers.ts';

describe('CAdES .p7m', () => {
  test('envelopes unwrap and expose the declared certificate details', () => {
    const pdf = unwrapP7m(sampleBytes('contratto-esempio.pdf.p7m'));
    expect(pdf.contentKind).toBe('pdf');
    const s = pdf.layers[0][0];
    expect(s.subject.CN).toBe('ROSSI MARIO (ESEMPIO)');
    expect(s.subject.serialNumber).toBe('TINIT-RSSMRA80A01H501U');
    expect(s.issuer.CN).toBe('Esempio CA (non valida)');
    expect(s.isCades).toBe(true);
    expect(s.declaresQualified).toBe(true);
    expect(s.nonRepudiation).toBe(true);
    expect(s.digestAlgorithm).toBe('SHA-256');
    expect(s.signingTime).toBeInstanceOf(Date);
    expect(innerFileName('contratto-esempio.pdf.p7m', pdf.contentKind)).toBe('contratto-esempio.pdf');

    const xml = unwrapP7m(sampleBytes('fattura-esempio.xml.p7m'));
    expect(xml.contentKind).toBe('xml');
    expect(new TextDecoder().decode(xml.content)).toBe(new TextDecoder().decode(sampleBytes('fattura-esempio.xml')));
  });

  test('base64-armoured envelopes unwrap', () => {
    const der = sampleBytes('contratto-esempio.pdf.p7m');
    const b64 = new TextEncoder().encode(Buffer.from(der).toString('base64').replace(/(.{64})/g, '$1\n'));
    expect(unwrapP7m(b64).contentKind).toBe('pdf');
  });

  test('non-CMS input is rejected with a clear code', () => {
    expect(() => unwrapP7m(sampleBytes('fattura-esempio.xml'))).toThrow('not-cms');
  });

  test('nested envelopes unwrap to the innermost document and report every layer', () => {
    const res = unwrapP7m(sampleBytes('contratto-esempio.pdf.p7m.p7m'));
    expect(res.layers).toHaveLength(2);
    expect(res.contentKind).toBe('pdf');
    expect(innerFileName('contratto-esempio.pdf.p7m.p7m', res.contentKind)).toBe('contratto-esempio.pdf');
  });
});
