// Runs the built package the way a consumer would import it: by its package name, through the "exports" map.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';
import { checkInvoice, readInvoice, validateEn16931 } from 'eu-einvoice-reader';
import { readSignedXml, unwrapP7m } from 'eu-einvoice-reader/signatures';

const sample = (name) => new Uint8Array(readFileSync(new URL(`./samples/${name}`, import.meta.url)));
const parser = new DOMParser();

const r = readInvoice(sample('xrechnung-beispiel.xml'), { parser });
assert.equal(r.format, 'ubl');
assert.equal(r.invoice.number, 'RE-2026-0418');
assert.deepEqual(checkInvoice(r).filter((c) => c.status !== 'pass'), []);
assert.equal(validateEn16931(sample('facture-exemple.xml'), { parser, lang: 'fr' }).findings.filter((f) => f.status === 'fail').length, 0);
assert.equal(readInvoice(sample('faktura-ksef-przyklad.xml'), { parser }).format, 'ksef');
assert.equal(unwrapP7m(sample('fattura-esempio.xml.p7m')).contentKind, 'xml');
assert.equal((await readSignedXml(sample('facturae-ejemplo.xsig'), { parser })).content.kind, 'facturae');
console.log('dist smoke test passed');
