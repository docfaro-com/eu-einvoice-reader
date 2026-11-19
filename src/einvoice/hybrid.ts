/** An embedded file as PDF libraries list them (pdf.js getAttachments(), pdf-lib, pypdf …). */
export interface PdfAttachment {
  filename: string;
}

/* File names fixed by the specs: Factur-X / ZUGFeRD 2.1+, XRechnung-in-PDF, and ZUGFeRD 2.0 / 1.0 (compared case-insensitively). */
export const KNOWN_XML_NAMES = ['factur-x.xml', 'xrechnung.xml', 'zugferd-invoice.xml'];

export function pickInvoiceXml<T extends PdfAttachment>(list: T[]): T | null {
  const byName = (n: string) => list.find((a) => a.filename.toLowerCase() === n);
  for (const n of KNOWN_XML_NAMES) {
    const hit = byName(n);
    if (hit) return hit;
  }
  return list.find((a) => a.filename.toLowerCase().endsWith('.xml')) ?? null;
}
