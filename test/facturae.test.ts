import { describe, expect, test } from 'vitest';
import { checkFacturae } from '../src/facturae/checks.ts';
import { checkNif } from '../src/facturae/nif.ts';
import { fullNumber, NotFacturaeError, parseFacturae } from '../src/facturae/parse.ts';
import { readSignedXml } from '../src/signatures.ts';
import { NoSignatureError, readXsig } from '../src/xades/xades.ts';
import { parseXml } from '../src/xml.ts';
import { parser, sample, sampleBytes } from './helpers.ts';

const fails = (xml: string) => checkFacturae(parseFacturae(xml, parser), 'es').filter((r) => r.status !== 'pass');

describe('Spanish tax IDs', () => {
  test('DNI, NIE and entity check characters', () => {
    expect(checkNif('12345678Z')).toEqual({ normalised: '12345678Z', kind: 'dni', valid: true });
    expect(checkNif('12345678A').valid).toBe(false);
    expect(checkNif('X1234567L')).toMatchObject({ kind: 'nie', valid: true });
    expect(checkNif('Y1234567X').valid).toBe(true);
    expect(checkNif('ESB76543214')).toMatchObject({ normalised: 'B76543214', kind: 'entity', valid: true });
    expect(checkNif('B76543215').valid).toBe(false);
    // P (public bodies) must end in a letter; the digit with the same value is not accepted.
    expect(checkNif('P9999999G').valid).toBe(true);
    expect(checkNif('P99999997').valid).toBe(false);
    // The seller NIF in AutoFirma's own test invoice; its control digit would be 7.
    expect(checkNif('A82735122').valid).toBe(false);
    expect(checkNif('A82735127').valid).toBe(true);
    expect(checkNif('hello').kind).toBe(null);
  });
});

describe('the synthetic demo invoice', () => {
  const fe = parseFacturae(sample('facturae-ejemplo.xml'), parser);
  test('header, parties, totals', () => {
    expect(fe.version).toBe('3.2.2');
    expect(fe.modality).toBe('I');
    expect(fe.signed).toBe(false);
    expect(fe.seller).toMatchObject({ name: 'Laura Gómez Ruiz', taxId: '12345678Z', personType: 'F', residence: 'R' });
    expect(fe.seller.address).toMatchObject({ town: 'Madrid', postCode: '28001', country: 'ESP', overseas: false });
    expect(fe.buyer).toMatchObject({ name: 'Asesoría Martínez S.L.', tradeName: 'Asesoría Martínez' });
    const inv = fe.invoices[0];
    expect(fullNumber(inv)).toBe('A2026-0418');
    expect(inv.issueDate).toBe('2026-11-03');
    expect(inv.lines).toHaveLength(3);
    expect(inv.lines[2]).toMatchObject({ unit: '01', totalCost: '120.00', gross: '108.00', articleCode: 'FOL-A5-500' });
    expect(inv.lines[2].discounts).toEqual([{ reason: 'Descuento por volumen', rate: '10.0000', amount: '12.00' }]);
    expect(inv.taxes).toEqual([{ type: '01', rate: '21.00', base: '988.00', amount: '207.48', surchargeRate: '', surchargeAmount: '' }]);
    expect(inv.withheld[0]).toMatchObject({ type: '04', rate: '15.00', base: '880.00', amount: '132.00' });
    expect(inv.totals).toMatchObject({ gross: '988.00', invoiceTotal: '1063.48', outstanding: '1063.48', executable: '1063.48', taxesWithheld: '132.00' });
    expect(inv.installments[0]).toMatchObject({ dueDate: '2026-12-03', amount: '1063.48', means: '04', bic: 'CAIXESBBXXX' });
  });
  test('every check passes', () => {
    const results = checkFacturae(fe, 'es');
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
    expect(results.map((r) => r.rule)).toEqual(
      expect.arrayContaining(['FE-COST', 'FE-GROSS', 'FE-TOTAL-GROSS', 'FE-TAX-RATE', 'FE-WITHHELD-RATE', 'FE-INVOICE-TOTAL', 'FE-EXECUTABLE', 'FE-INSTALLMENTS', 'FE-BATCH-TOTAL', 'NIF', 'IBAN']),
    );
  });
  test('the signed copy holds the same invoice', () => {
    const signed = parseFacturae(sample('facturae-ejemplo.xsig'), parser);
    expect(signed.signed).toBe(true);
    expect(signed.invoices[0].totals.executable).toBe('1063.48');
  });
});

describe('arithmetic and identifier errors are caught', () => {
  const base = sample('facturae-ejemplo.xml');
  test('a wrong invoice total', () => {
    const bad = fails(base.replace('<InvoiceTotal>1063.48</InvoiceTotal>', '<InvoiceTotal>1195.48</InvoiceTotal>'));
    expect(bad.map((r) => r.rule)).toEqual(['FE-INVOICE-TOTAL', 'FE-OUTSTANDING', 'FE-BATCH-TOTAL']);
    expect(bad[0].message).toBe('Total factura 1195.48, pero base + impuestos − retenciones da 1063.48');
  });
  test('a line whose quantity does not match its cost', () => {
    const bad = fails(base.replace('<Quantity>8</Quantity>', '<Quantity>9</Quantity>'));
    expect(bad.map((r) => r.rule)).toEqual(['FE-COST']);
    expect(bad[0].message).toContain('Línea 2');
  });
  test('a mistyped NIF and IBAN', () => {
    const bad = fails(base.replace('<TaxIdentificationNumber>12345678Z<', '<TaxIdentificationNumber>12345678A<').replace(/<IBAN>ES(\d\d)/, '<IBAN>ES00'));
    expect(bad.map((r) => r.rule)).toEqual(['IBAN', 'NIF']);
    expect(checkFacturae(parseFacturae(base.replace('12345678Z', '12345678A'), parser), 'en').find((r) => r.rule === 'NIF')?.message).toBe(
      'Tax ID (NIF) of the seller 12345678A: check character invalid',
    );
  });
  test('a VAT amount that does not match its rate', () => {
    expect(fails(base.replace('<TaxAmount><TotalAmount>207.48</TotalAmount>', '<TaxAmount><TotalAmount>217.48</TotalAmount>')).map((r) => r.rule)).toEqual([
      'FE-TAX-RATE',
      'FE-TAX-OUTPUTS',
    ]);
  });
  test('not a Facturae', () => {
    expect(() => parseFacturae('<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"/>', parser)).toThrow(NotFacturaeError);
  });
});

describe('synthetic test files', () => {
  test('invoice to a public body (FACe) with DIR3 units, two VAT rates and an attached PDF', () => {
    const fe = parseFacturae(sample('face-ayuntamiento-322.xml'), parser);
    expect(fe.buyer.centres.map((c) => [c.role, c.code])).toEqual([
      ['01', 'L01999901'],
      ['02', 'L01999902'],
      ['03', 'L01999903'],
    ]);
    const inv = fe.invoices[0];
    expect(fullNumber(inv)).toBe('F26118');
    expect(inv.taxes.map((t) => t.rate)).toEqual(['21.00', '4.00']);
    expect(inv.references).toEqual([{ label: 'file', value: 'EXP-2026-0042' }]);
    expect(inv.lines[1].references).toEqual([
      { label: 'receiverContract', value: 'CTR-2026-17' },
      { label: 'file', value: 'EXP-2026-0042' },
    ]);
    expect(inv.legalLiterals).toEqual(['Factura sujeta al plazo de pago de la Ley 3/2004.']);
    expect(inv.attachments[0]).toMatchObject({ format: 'pdf', encoding: 'BASE64', description: 'Albarán de entrega' });
    expect(atob(inv.attachments[0].data).startsWith('%PDF-')).toBe(true);
    expect(fe.seller.registration).toBe('Madrid, Tomo 1, Libro 0, Folio 1, Hoja M-000001');
    const results = checkFacturae(fe, 'es');
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
    expect(results.find((r) => r.rule === 'FACe DIR3')?.status).toBe('pass');
  });
  test('a missing DIR3 unit is a warning', () => {
    const xml = sample('face-ayuntamiento-322.xml').replace('<RoleTypeCode>03</RoleTypeCode>', '<RoleTypeCode>04</RoleTypeCode>');
    const r = checkFacturae(parseFacturae(xml, parser), 'es').find((x) => x.rule === 'FACe DIR3');
    expect(r).toMatchObject({ status: 'warn', message: 'Falta(n) en el cliente: unidad tramitadora (03). FACe exige los tres códigos DIR3' });
  });
  test('a batch (lote) of two invoices in Facturae 3.2.1, encoded ISO-8859-1', () => {
    const fe = parseFacturae(sample('lote-321-latin1.xml'), parser);
    expect(fe.version).toBe('3.2.1');
    expect(fe.modality).toBe('L');
    expect(fe.seller.name).toBe('Panadería Núñez S.A.');
    expect(fe.invoices.map(fullNumber)).toEqual(['L0007', 'L0008']);
    expect(fe.batch).toMatchObject({ count: '2', totalInvoices: '541.20', currency: 'EUR' });
    const results = checkFacturae(fe, 'es');
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
    // In a batch every message names its invoice.
    expect(results.find((r) => r.rule === 'FE-INVOICE-TOTAL')?.message.startsWith('L0007: ')).toBe(true);
    const wrong = checkFacturae(parseFacturae(sample('lote-321-latin1.xml').replace('<InvoicesCount>2<', '<InvoicesCount>3<'), parser), 'en');
    expect(wrong.find((r) => r.rule === 'FE-BATCH-COUNT')).toMatchObject({ status: 'fail', message: 'The batch declares 3 invoice(s), but the file holds 2' });
  });
  test('a corrective invoice with negative amounts', () => {
    const fe = parseFacturae(sample('rectificativa-322.xml'), parser);
    const inv = fe.invoices[0];
    expect(inv.invoiceClass).toBe('OR');
    expect(inv.corrective).toMatchObject({ number: '2026-0418', series: 'A', reasonCode: '16', method: '02', issueDate: '2026-11-03' });
    expect(inv.totals.invoiceTotal).toBe('-26.14');
    const results = checkFacturae(fe, 'es');
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
    expect(results.find((r) => r.rule === 'FE-CORRECTIVE')?.message).toBe('Factura rectificativa: identifica la factura A2026-0418');
    const missing = sample('rectificativa-322.xml').replace(/<Corrective>.*<\/Corrective>/s, '');
    expect(fails(missing).map((r) => r.rule)).toEqual(['FE-CORRECTIVE']);
  });
});

describe('XAdES signatures (.xsig)', () => {
  const doc = (xml: string) => parseXml(xml, parser);
  test('the enveloped Facturae signature of the demo file', async () => {
    const r = await readXsig(doc(sample('facturae-ejemplo.xsig')));
    expect(r.content).toEqual({ kind: 'facturae' });
    expect(r.signatures).toHaveLength(1);
    const s = r.signatures[0];
    expect(s).toMatchObject({ placement: 'enveloped', form: 'XAdES-EPES', xadesVersion: '1.3.2', signatureAlgorithm: 'RSA-SHA256', digestAlgorithm: 'SHA-256', roles: ['emisor'], hasTimestamp: false, certificateCount: 2 });
    expect(s.policy).toMatchObject({ facturae: '3.1', description: 'Política de Firma FacturaE v3.1' });
    expect(s.signingTime?.toISOString()).toBe('2026-11-03T09:15:00.000Z');
    // The signer is picked by the certificate digest in SigningCertificateV2, not by position.
    expect(s.certificate?.subject.CN).toBe('GÓMEZ RUIZ LAURA - 12345678Z (EJEMPLO)');
    expect(s.certificate?.subject.serialNumber).toBe('IDCES-12345678Z');
    expect(s.certificate?.issuer.CN).toBe('AC de pruebas EJEMPLO (no válida)');
    expect(s.certificate?.declaresQualified).toBe(true);
    expect(s.certificate?.nonRepudiation).toBe(true);
  });
  test('an enveloping signature carrying a PDF', async () => {
    const r = await readXsig(doc(sample('contrato-enveloping.xsig')));
    expect(r.signatures[0]).toMatchObject({ placement: 'enveloping', form: 'XAdES-BES', policy: null });
    expect(r.content.kind).toBe('embedded');
    if (r.content.kind !== 'embedded') return;
    expect(r.content.mimeType).toBe('application/pdf');
    expect(new TextDecoder().decode(r.content.bytes.subarray(0, 5))).toBe('%PDF-');
  });
  test('AutoFirma-style detached signature next to an AFIRMA/CONTENT element', async () => {
    const r = await readXsig(doc(sample('contrato-afirma-detached.xsig')));
    expect(r.signatures[0]).toMatchObject({ placement: 'detached', dataReferences: ['#CONTENT-0001'] });
    expect(r.content).toMatchObject({ kind: 'embedded', mimeType: 'application/pdf', fileName: 'contrato.pdf' });
  });
  test('a signature that points to an external file', async () => {
    const xml = sample('contrato-enveloping.xsig').replace('URI="#object"', 'URI="contrato.pdf"');
    const r = await readXsig(doc(xml));
    expect(r.content).toEqual({ kind: 'detached', uri: 'contrato.pdf' });
  });
  test('an unsigned file', async () => {
    await expect(readXsig(doc(sample('facturae-ejemplo.xml')))).rejects.toThrow(NoSignatureError);
  });
});


test('readSignedXml takes bytes', async () => {
  const r = await readSignedXml(sampleBytes('documento-firmado.xsig'), { parser });
  expect(r.signatures.length).toBeGreaterThan(0);
});
