import { describe, expect, test } from 'vitest';
import { runChecks } from '../src/einvoice/checks.ts';
import { parseEInvoice } from '../src/einvoice/detect.ts';
import { checkFacturae } from '../src/facturae/checks.ts';
import { parseFacturae } from '../src/facturae/parse.ts';
import { parseFatturaPA } from '../src/fatturapa/parse.ts';
import { runKsefChecks } from '../src/ksef/checks.ts';
import { parseKsef } from '../src/ksef/parse.ts';
import { unwrapP7m } from '../src/p7m/cms.ts';
import { validateEn16931 } from '../src/read.ts';
import { readXsig } from '../src/xades/xades.ts';
import { parseXml } from '../src/xml.ts';
import { fixture, fixtureBytes, fixturePresent, manifest, parser } from './helpers.ts';

/*
 * Official and third-party samples, downloaded by `npm run fixtures` (not committed: several may not be
 * redistributed). Expected values were extracted independently with xmllint / Python ElementTree.
 */
const present = manifest.filter((e) => e.expected && fixturePresent(e.path));
const of = (kind: string) => present.filter((e) => e.expected!.kind === kind);

describe.skipIf(!of('ubl').length && !of('cii').length)('KoSIT XRechnung test suite and CEN examples', () => {
  for (const e of [...of('ubl'), ...of('cii')]) {
    test(e.path, () => {
      const exp = e.expected!;
      const inv = parseEInvoice(fixture(e.path), parser);
      expect(inv.number).toBe(exp.number);
      expect(inv.issueDate).toBe(exp.issueDate);
      expect(inv.seller.name).toBe(exp.seller);
      expect(inv.buyer.name).toBe(exp.buyer);
      expect(inv.currency).toBe(exp.currency);
      expect(inv.totals.payable).toBe(exp.total);
      if (exp.typeCode) expect(inv.typeCode).toBe(exp.typeCode);
      expect(inv.lines.length).toBeGreaterThan(0);
      expect(runChecks(inv, 'en').filter((c) => c.status === 'fail')).toEqual([]);
      const rules = validateEn16931(fixtureBytes(e.path), { parser });
      expect(rules.findings.filter((f) => f.status === 'fail')).toEqual([]);
    });
  }
});

describe.skipIf(!of('peppol').length)('OpenPeppol BIS Billing 3.0 examples', () => {
  for (const e of of('peppol')) {
    test(e.path, () => {
      const exp = e.expected!;
      const inv = parseEInvoice(fixture(e.path), parser);
      expect(inv.isCreditNote).toBe(exp.root === 'CreditNote');
      expect(inv.number).toBe(exp.number);
      expect(inv.issueDate).toBe(exp.issueDate);
      expect(inv.seller.name).toBe(exp.seller);
      expect(inv.buyer.name).toBe(exp.buyer);
      expect(inv.currency).toBe(exp.currency);
      expect(inv.totals.payable).toBe(exp.total);
      expect(inv.typeCode).toBe(exp.typeCode);
      expect(runChecks(inv, 'en').filter((r) => r.status === 'fail').map((r) => r.rule)).toEqual(exp.knownFails);
    });
  }
});

describe.skipIf(!of('fatturapa').length)('FatturaPA examples (fatturapa.gov.it)', () => {
  for (const e of of('fatturapa')) {
    test(e.path, () => {
      const exp = e.expected! as typeof e.expected & { version: string; bodies?: { number: string; issueDate: string; currency: string; total: string }[] };
      const fp = parseFatturaPA(fixture(e.path), parser);
      expect(fp.version).toBe(exp.version);
      expect(fp.seller.name).toBe(exp.seller);
      expect(fp.buyer.name).toBe(exp.buyer);
      const bodies = exp.bodies ?? [{ number: exp.number, issueDate: exp.issueDate, currency: exp.currency, total: exp.total }];
      expect(fp.bodies.length).toBe(bodies.length);
      bodies.forEach((b, i) => {
        expect(fp.bodies[i].number).toBe(b.number);
        expect(fp.bodies[i].date).toBe(b.issueDate);
        expect(fp.bodies[i].currency).toBe(b.currency);
        expect(fp.bodies[i].amountDue).toBe(b.total);
        expect(fp.bodies[i].lines.length).toBeGreaterThan(0);
      });
    });
  }
});

describe.skipIf(!of('p7m').length)('CAdES from the EU DSS test suite', () => {
  for (const e of of('p7m')) {
    test(e.path, () => {
      const exp = e.expected! as typeof e.expected & { innerKind: string; signerCN: string };
      const res = unwrapP7m(fixtureBytes(e.path));
      expect(res.contentKind).toBe(exp.innerKind);
      expect(res.layers[0][0].subject.CN).toBe(exp.signerCN);
      expect(res.layers[0][0].certificateFound).toBe(true);
      expect(res.layers[0][0].notAfter).toBeInstanceOf(Date);
    });
  }
});

describe.skipIf(!of('ksef').length)('KSeF examples (Ministry of Finance, CIRFMF)', () => {
  for (const e of of('ksef')) {
    test(e.path, () => {
      const exp = e.expected! as typeof e.expected & { variant: string; sellerNip: string; lines: number };
      const inv = parseKsef(fixture(e.path), parser);
      expect(inv.variant).toBe(exp.variant);
      expect(inv.number).toBe(exp.number);
      expect(inv.issueDate).toBe(exp.issueDate);
      expect(inv.seller.name).toBe(exp.seller);
      expect(inv.seller.nip).toBe(exp.sellerNip);
      expect(inv.buyer.name).toBe(exp.buyer);
      expect(inv.currency).toBe(exp.currency);
      expect(inv.total).toBe(exp.total);
      expect(inv.kind).toBe(exp.typeCode);
      expect(inv.lines).toHaveLength(exp.lines);
      expect(runKsefChecks(inv, 'pl').filter((r) => r.status === 'fail').map((r) => r.rule)).toEqual(exp.knownFails);
    });
  }
});

// Real AutoFirma output from the Spanish government's signing client test suite; MITyC test certificates.
const AF32 = 'facturae/afirma-sample-factura-firmada-32v1.xsig.xml';
const AF31 = 'facturae/afirma-sample-facturae-firmada.xsig.xml';
describe.skipIf(!fixturePresent(AF32) || !fixturePresent(AF31))('AutoFirma test files', () => {
  test('Facturae 3.2 signed with XAdES-EPES', async () => {
    const xml = fixture(AF32);
    const fe = parseFacturae(xml, parser);
    expect(fe.version).toBe('3.2');
    expect(fe.signed).toBe(true);
    expect(fe.seller.name).toBe('Company Comp SA');
    expect(fe.batch.totalInvoices).toBe('63.13');
    expect(checkFacturae(fe, 'es').find((r) => r.rule === 'FE-BATCH-TOTAL')?.status).toBe('pass');
    const r = await readXsig(parseXml(xml, parser));
    expect(r.content.kind).toBe('facturae');
    expect(r.signatures[0]).toMatchObject({ placement: 'enveloped', form: 'XAdES-EPES', digestAlgorithm: 'SHA-1' });
    expect(r.signatures[0].policy?.facturae).toBe('3.1');
    expect(r.signatures[0].certificate?.subject.CN).toBe('Usuario 54');
    expect(r.signatures[0].signingTime?.toISOString()).toBe('2010-03-10T11:46:58.000Z');
  });
  test('Facturae 3.1 (older namespace) is read the same way', () => {
    const fe = parseFacturae(fixture(AF31), parser);
    expect(fe.version).toBe('3.1');
    expect(fe.invoices.length).toBeGreaterThan(0);
    expect(fe.invoices[0].number).not.toBe('');
  });
});
