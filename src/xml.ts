/**
 * Namespace-agnostic XML access. E-invoice files in the wild use arbitrary
 * prefixes (and ZUGFeRD 1.0 uses different namespaces than 2.x), so lookups
 * match on localName only and walk direct children, never descendants, to
 * avoid picking up a line item's ID when asking for the document's ID.
 */

export type XmlParser = { parseFromString(text: string, type: string): Document };

export class XmlError extends Error {}

export function parseXml(text: string, parser: XmlParser): Document {
  const doc = parser.parseFromString(text, 'application/xml');
  // Browsers report malformed XML as a <parsererror> document instead of throwing.
  const err = doc.getElementsByTagName('parsererror');
  if (err.length > 0 || !doc.documentElement) {
    throw new XmlError('not-well-formed');
  }
  return doc;
}

const ENCODING_RE = /<\?xml[^>]*encoding\s*=\s*["']([A-Za-z0-9._-]+)["']/;

/**
 * Decode bytes honouring the BOM and the XML declaration. Italian invoices are
 * often declared as ISO-8859-1/windows-1252; decoding them as UTF-8 would
 * garble accented names.
 */
export function decodeXmlBytes(bytes: Uint8Array): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 256));
  const declared = ENCODING_RE.exec(head)?.[1]?.toLowerCase();
  let label = 'utf-8';
  if (declared) {
    try {
      new TextDecoder(declared);
      label = declared;
    } catch {
      label = 'utf-8';
    }
  }
  const text = new TextDecoder(label).decode(bytes);
  // DOMParser rejects a declaration that disagrees with the already-decoded string in some engines.
  return text.replace(/^\s*<\?xml[^>]*\?>/, '');
}

export function elementChildren(el: Element | null | undefined): Element[] {
  if (!el) return [];
  const out: Element[] = [];
  const nodes = el.childNodes;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.nodeType === 1) out.push(n as Element);
  }
  return out;
}

export function localName(el: Element): string {
  return el.localName ?? el.nodeName.replace(/^.*:/, '');
}

/** Each path step may list alternatives separated by "|". */
function matchStep(el: Element, step: string): boolean {
  const ln = localName(el);
  return step.split('|').includes(ln);
}

export function all(el: Element | null | undefined, path: string): Element[] {
  if (!el) return [];
  let current: Element[] = [el];
  for (const step of path.split('/')) {
    const next: Element[] = [];
    for (const c of current) {
      for (const child of elementChildren(c)) {
        if (matchStep(child, step)) next.push(child);
      }
    }
    current = next;
    if (current.length === 0) break;
  }
  return current;
}

export function first(el: Element | null | undefined, path: string): Element | null {
  return all(el, path)[0] ?? null;
}

export function text(el: Element | null | undefined, path?: string): string {
  const target = path ? first(el, path) : el;
  return (target?.textContent ?? '').trim();
}

export function texts(el: Element | null | undefined, path: string): string[] {
  return all(el, path)
    .map((e) => (e.textContent ?? '').trim())
    .filter(Boolean);
}

export function attr(el: Element | null | undefined, path: string, name: string): string {
  const target = path ? first(el, path) : el;
  return target?.getAttribute(name)?.trim() ?? '';
}

export function rootName(doc: Document): string {
  return localName(doc.documentElement);
}

export function rootNamespace(doc: Document): string {
  return doc.documentElement.namespaceURI ?? '';
}
