# Third-party notices

## Runtime dependencies

Used only by the `eu-einvoice-reader/signatures` entry point. The main entry point has no runtime dependencies.

| Package | License | Copyright |
|---|---|---|
| [pkijs](https://github.com/PeculiarVentures/PKI.js) | BSD-3-Clause | GlobalSign (2014), Peculiar Ventures (2015-2019) |
| [asn1js](https://github.com/PeculiarVentures/ASN1.js) | BSD-3-Clause | GMO GlobalSign (2014), Peculiar Ventures (2015-2022) |
| [bytestreamjs](https://github.com/PeculiarVentures/ByteStream.js) (via pkijs) | BSD-3-Clause | Peculiar Ventures (2016-2022) |
| [@peculiar/utils](https://github.com/PeculiarVentures/utils) (via pkijs, asn1js) | MIT | Peculiar Ventures, LLC (2017-2026) |
| [@noble/hashes](https://github.com/paulmillr/noble-hashes) (via pkijs) | MIT | Paul Miller (2022) |

They are installed as npm dependencies, not copied into this package. Their licence texts ship with each package. If you bundle them into an application, the BSD-3-Clause licences require you to keep their copyright notices.

## Data in the source code

- **Code lists** in `src/einvoice/codelists.ts` (invoice type codes, ISO 4217 currencies, ISO 3166 countries, UNTDID 4461 payment means, UNCL 5305 VAT categories, UN/ECE Recommendation 20/21 units, the EAS scheme list) are the code values that the CEN EN 16931 Schematron in the KoSIT XRechnung 3.0.2 validator configuration checks against. Only the code values are used.
- **Rule IDs** (`BR-…`, `BR-DE-…`, `PEPPOL-…`) and business term numbers (`BT-…`, `BG-…`) are the identifiers from EN 16931, the XRechnung specification and Peppol BIS Billing 3.0. The rule explanations and fix hints are written for this project and are not the official rule texts.
- **Code labels** (German, English, Italian, Dutch, French, Spanish, Polish) in the `codes.ts` files are written for this project.

## Test data

`test/samples/` contains only synthetic files made for this project: invented companies and numbers, and self-signed test certificates whose names contain "ESEMPIO" or "EJEMPLO". They are covered by this project's MIT licence.

Official samples (KoSIT XRechnung test suite, CEN eInvoicing-EN16931 examples, OpenPeppol BIS examples, fatturapa.gov.it examples, Polish Ministry of Finance and CIRFMF KSeF examples, AutoFirma test files, EU DSS test files) are not part of this repository or the npm package. `npm run fixtures` downloads them for local testing; their sources and licences are listed in `test/fixtures.json`.
