# eu-einvoice-reader

Read European e-invoices in the browser or in Node.js and turn them into plain JavaScript objects: XRechnung, ZUGFeRD and Factur-X (CII), Peppol BIS Billing 3.0 and other UBL 2.1 invoices, Italian FatturaPA, Spanish Facturae and Polish KSeF FA(3). It also runs a pre-check of the EN 16931 and XRechnung business rules with a plain-language explanation and fix hint for each finding, and opens signed `.p7m` (CAdES) and `.xsig` (XAdES) files.

Everything runs locally. Invoice parsing has no runtime dependencies; the signature entry point uses [PKI.js](https://github.com/PeculiarVentures/PKI.js) and [ASN1.js](https://github.com/PeculiarVentures/ASN1.js).

The code was extracted from the free tools at [docfaro.com](https://docfaro.com). Online version (no install, files are not uploaded): https://docfaro.com

## Why

An e-invoice is an XML file, and each country uses its own format. To show one to a person, import it into accounting software, or check it before sending, you have to deal with UBL and CII syntax, the older ZUGFeRD 1.0 schema, FatturaPA lots, Facturae batches, KSeF's VAT rows, files encoded in ISO-8859-1, and signed envelopes around all of them. This library handles those details and gives you one object per format, with amounts kept as the exact strings from the XML.

## Supported formats

| Format | Syntax / versions | What you get | Try it online |
|---|---|---|---|
| XRechnung (Germany) | UBL 2.1 and CII D16B, XRechnung 2.x and 3.x | EN 16931 model, profile, plausibility checks, business rules | [XRechnung viewer](https://docfaro.com/xrechnung-viewer/), [validator](https://docfaro.com/xrechnung-validator/) |
| ZUGFeRD / Factur-X | CII from ZUGFeRD 1.0, 2.x and Factur-X 1.0 (MINIMUM to EXTENDED, XRECHNUNG) | EN 16931 model, profile, checks, business rules (not for ZUGFeRD 1.0) | [ZUGFeRD viewer](https://docfaro.com/zugferd-viewer/), [Factur-X validator (FR)](https://docfaro.com/fr/validateur-factur-x/) |
| Peppol BIS Billing 3.0 | UBL 2.1 Invoice and CreditNote, also inside an SBDH envelope | EN 16931 model, Peppol checks, Belgian enterprise number check digits | [Peppol viewer](https://docfaro.com/peppol-invoice-viewer/) |
| FatturaPA (Italy) | FPA12 and FPR12 (version 1.2), lots with several bodies | FatturaPA model | [FatturaPA viewer](https://docfaro.com/fatturapa-viewer/) |
| Facturae (Spain) | 3.x (tested with 3.1, 3.2, 3.2.1 and 3.2.2), batches, signed or unsigned | Facturae model, totals arithmetic, NIF and IBAN check characters, DIR3 units for FACe | [Facturae viewer](https://docfaro.com/facturae-viewer/) |
| KSeF (Poland) | FA(3) and FA(2) | KSeF model, VAT row arithmetic, NIP and account check digits, KOD I link | [KSeF viewer](https://docfaro.com/ksef-invoice-viewer/) |
| CAdES `.p7m` | attached SignedData, DER or base64, nested envelopes | the signed content plus what each envelope says about its signers | [P7M viewer](https://docfaro.com/p7m-viewer/) |
| XAdES `.xsig` | enveloped, enveloping, detached (AutoFirma style) | signatures, signer certificate, policy, embedded document | [XSIG viewer](https://docfaro.com/xsig-viewer/) |

### What it does not do

- **No XSD or Schematron validation.** `validateEn16931` re-implements 192 EN 16931 and XRechnung rules in JavaScript (list them with `coveredRules()`). It is a pre-check and does not replace the official [KoSIT validator](https://github.com/itplr-kosit/validator).
- **No signature verification.** The `.p7m` and `.xsig` readers report what the signature *claims* (signer, time, policy, declared qualified status). They do not check the signature value, the certificate chain or revocation.
- **No PDF parsing.** For ZUGFeRD/Factur-X PDFs, take the embedded XML out with your PDF library and pass it in; `pickInvoiceXml` picks the right attachment (see below).
- FatturaPA has no plausibility checks yet, and the simplified format (FatturaElettronicaSemplificata) is not supported.

## Install

```sh
npm install eu-einvoice-reader
```

ESM only, with TypeScript types. Requires Node.js 22.12 or newer, or any current browser.

Browsers have a built-in `DOMParser`. Node.js does not, so pass one in, for example from [@xmldom/xmldom](https://github.com/xmldom/xmldom):

```sh
npm install @xmldom/xmldom
```

## Usage

### Read any supported invoice

```js
import { readFile } from 'node:fs/promises';
import { DOMParser } from '@xmldom/xmldom';
import { checkInvoice, readInvoice } from 'eu-einvoice-reader';

const parser = new DOMParser(); // leave out in the browser
const result = readInvoice(await readFile('invoice.xml'), { parser });

switch (result.format) {
  case 'ubl':
  case 'cii': {
    const inv = result.invoice;
    console.log(result.profile.standard, result.profile.profile); // e.g. "xrechnung" "XRechnung"
    console.log(inv.number, inv.issueDate, inv.seller.name, inv.totals.payable, inv.currency);
    for (const line of inv.lines) console.log(line.name, line.quantity, line.unit, line.amount);
    break;
  }
  case 'fatturapa':
    for (const body of result.invoice.bodies) console.log(body.number, body.date, body.amountDue);
    break;
  case 'facturae':
    for (const inv of result.invoice.invoices) console.log(inv.series + inv.number, inv.totals.executable);
    break;
  case 'ksef':
    console.log(result.invoice.number, result.invoice.total);
    break;
}

// Totals, VAT per rate, mandatory fields, IBAN/NIF/NIP check digits
for (const c of checkInvoice(result, 'en')) {
  if (c.status !== 'pass') console.log(c.status, c.rule, c.message);
}
```

Input can be a string, a `Uint8Array` or an `ArrayBuffer`. Bytes are decoded according to the BOM and the XML declaration, so ISO-8859-1 FatturaPA and Facturae files keep their accents.

`detectFormat(xml)` returns `'ubl' | 'cii' | 'fatturapa' | 'fatturapa-simplified' | 'facturae' | 'ksef' | 'unknown'` without parsing the rest of the file.

### EN 16931 / XRechnung business rules

```js
import { validateEn16931 } from 'eu-einvoice-reader';

const report = validateEn16931(xml, { parser, lang: 'en' }); // 'de' | 'en' | 'fr'
console.log(report.profile, report.isXRechnung);
for (const f of report.findings.filter((f) => f.status !== 'pass')) {
  console.log(`${f.rule} (${f.severity}) ${f.message}`);
  console.log(`  fix: ${f.fix}`);
  if (f.detail) console.log(`  ${f.detail}`);
}
```

Each finding has the rule ID (`BR-CO-15`, `BR-DE-15`, …), the business term (`BT-112`), a plain-language statement of the rule, a fix hint and, where useful, the values from the file. The explanations are written for this library; they are not the official rule texts. Rule IDs follow the CEN EN 16931 Schematron and the KoSIT XRechnung 3.0.2 Schematron.

### ZUGFeRD / Factur-X PDF

The XML sits inside the PDF as an attachment named `factur-x.xml`, `xrechnung.xml` or `zugferd-invoice.xml`. With [pdf.js](https://github.com/mozilla/pdf.js) 6 (in Node.js import `pdfjs-dist/legacy/build/pdf.mjs`):

```js
import { getDocument } from 'pdfjs-dist';
import { pickInvoiceXml, readInvoice } from 'eu-einvoice-reader';

const pdf = await getDocument({ data: pdfBytes }).promise;
// pdf.js 6 returns a Map keyed by attachment id
const list = [...((await pdf.getAttachments()) ?? [])].map(([id, a]) => ({ id, ...a }));
const hit = pickInvoiceXml(list);
if (hit) {
  // Recent pdf.js versions load attachment content on demand.
  const xml = hit.content ?? (await pdf.getAttachmentContent(hit.id));
  console.log(readInvoice(xml).invoice);
}
```

### Signed files

```js
import { readSignedXml, unwrapP7m } from 'eu-einvoice-reader/signatures';

// fattura.xml.p7m: DER or base64, nested envelopes are unwrapped
const { content, contentKind, layers } = unwrapP7m(p7mBytes);
console.log(contentKind); // 'xml', 'pdf', …
console.log(layers[0][0].subject.CN, layers[0][0].signingTime, layers[0][0].declaresQualified);

// .xsig (Facturae or any XAdES file)
const report = await readSignedXml(xsigBytes, { parser });
console.log(report.signatures[0].form, report.signatures[0].certificate?.subject.CN, report.content.kind);
```

`readSignedXml` uses Web Crypto to match the signer certificate by digest. In a browser that only exists in secure contexts (https or localhost); elsewhere it falls back to the first certificate in the signature.

### Lower-level API

The format-specific parsers are exported too: `parseEInvoice`, `parseUbl`, `parseCii`, `parseFatturaPA`, `parseFacturae`, `parseKsef`, and the checks `runChecks`, `runRules`, `checkFacturae`, `runKsefChecks`. They take the XML text and a `DOMParser`. Code labels for display are in `INVOICE_TYPES`, `PAYMENT_MEANS`, `VAT_CATEGORIES`, `UNITS` (with `label()`), `fatturapaCodes`, `facturaeCodes` and `ksefCodes`. The full list is in [`src/index.ts`](src/index.ts) and [`src/signatures.ts`](src/signatures.ts).

## Development

```sh
npm install
npm test             # unit tests with the synthetic samples in test/samples
npm run fixtures     # optional: download official samples (KoSIT, CEN, OpenPeppol, FatturaPA, KSeF, AutoFirma, EU DSS)
npm test             # now also runs against those
npm run build
```

The samples in `test/samples` are synthetic: invented companies and self-signed test certificates whose names say "ESEMPIO" or "EJEMPLO". Official samples are not committed, because several of them may not be redistributed. `npm run fixtures` downloads them from pinned URLs into `fixtures/` and checks each SHA-256; sources and licences are listed in [`test/fixtures.json`](test/fixtures.json).

## License

MIT. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

XRechnung, ZUGFeRD, Factur-X, Peppol, FatturaPA, Facturae and KSeF are names of standards and formats owned by their respective organisations. This project is not affiliated with or endorsed by any of them.
