/*
 * Signed containers, kept in their own entry point because they need asn1js and pkijs while the invoice parsers have
 * no runtime dependencies.
 */
import { resolveParser, toXmlText, type ReadOptions } from './read.ts';
import { parseXml } from './xml.ts';
import { readXsig, type XsigReport } from './xades/xades.ts';

export {
  describeCertificate,
  innerFileName,
  normaliseInput,
  P7mError,
  sniff,
  unwrapP7m,
  type CertificateInfo,
  type ContentKind,
  type DistinguishedName,
  type SignerReport,
  type UnwrapResult,
} from './p7m/cms.ts';
export { base64Bytes, NoSignatureError, readXsig, type Placement, type XadesSignature, type XsigContent, type XsigReport } from './xades/xades.ts';

/** `readXsig` for XML text or bytes instead of a parsed Document. */
export function readSignedXml(xml: string | Uint8Array | ArrayBuffer, options: ReadOptions = {}): Promise<XsigReport> {
  return readXsig(parseXml(toXmlText(xml), resolveParser(options.parser)));
}
