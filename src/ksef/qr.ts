/*
 * KOD I, the verification link that KSeF expects on any invoice visualisation
 * handed over outside the system (art. 106gb ust. 5 of the VAT Act). Format
 * per the Ministry's API documentation (ksef-api, kody-qr.md):
 * https://qr.ksef.mf.gov.pl/invoice/{seller NIP}/{P_1 as DD-MM-YYYY}/{SHA-256 of the file, Base64URL}
 * The hash is over the exact bytes of the file, so the link only resolves for
 * an unmodified file as stored in KSeF.
 */
export const KSEF_QR_BASE = 'https://qr.ksef.mf.gov.pl/invoice';

export function base64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Base64Url(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return base64Url(new Uint8Array(digest));
}

export function kodIUrl(nip: string, issueDate: string, hash: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(issueDate);
  if (!m || !/^\d{10}$/.test(nip)) return '';
  return `${KSEF_QR_BASE}/${nip}/${m[3]}-${m[2]}-${m[1]}/${hash}`;
}
