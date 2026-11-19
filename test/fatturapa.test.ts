import { describe, expect, test } from 'vitest';
import { NotFatturaPAError, parseFatturaPA } from '../src/fatturapa/parse.ts';
import { parser, sample } from './helpers.ts';

describe('FatturaPA', () => {
  test('synthetic sample', () => {
    const fp = parseFatturaPA(sample('fattura-esempio.xml'), parser);
    expect(fp.bodies[0].number).toBe('2026/118');
    expect(fp.bodies[0].total).toBe('1037.00');
    expect(fp.bodies[0].totalIsComputed).toBe(false);
    expect(fp.seller.vatId).toBe('IT01234567890');
    expect(fp.bodies[0].lines.length).toBeGreaterThan(0);
  });
  test('another format is rejected', () => {
    expect(() => parseFatturaPA(sample('xrechnung-beispiel.xml'), parser)).toThrow(NotFatturaPAError);
  });
});
