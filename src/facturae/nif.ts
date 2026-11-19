/*
 * Check characters of Spanish tax IDs (Orden EHA/451/2008 and Real Decreto 1065/2007): the DNI/NIE letter is the number
 * modulo 23; a legal entity's NIF ends in a digit or letter computed from its seven digits like a Luhn sum.
 */

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
// Entities whose control character is always a letter, or always a digit; the rest may use either.
const LETTER_ONLY = 'NPQRSW';
const DIGIT_ONLY = 'ABEH';

export type NifKind = 'dni' | 'nie' | 'entity' | 'special';

export interface NifResult {
  normalised: string;
  kind: NifKind | null;
  valid: boolean;
}

function entityControl(digits: string): { digit: string; letter: string } {
  let odd = 0;
  let even = 0;
  for (let i = 0; i < 7; i++) {
    const d = Number(digits[i]);
    if (i % 2 === 0) {
      const x = d * 2;
      odd += Math.floor(x / 10) + (x % 10);
    } else even += d;
  }
  const c = (10 - ((odd + even) % 10)) % 10;
  return { digit: String(c), letter: 'JABCDEFGHI'[c] };
}

/** Accepts the forms seen in invoices: with or without an ES prefix, spaces or hyphens. */
export function checkNif(raw: string): NifResult {
  const s = raw.toUpperCase().replace(/[\s.-]/g, '').replace(/^ES(?=[0-9A-Z]{9}$)/, '');
  if (/^\d{8}[A-Z]$/.test(s)) return { normalised: s, kind: 'dni', valid: DNI_LETTERS[Number(s.slice(0, 8)) % 23] === s[8] };
  if (/^[XYZ]\d{7}[A-Z]$/.test(s)) {
    const n = Number('XYZ'.indexOf(s[0]) + s.slice(1, 8));
    return { normalised: s, kind: 'nie', valid: DNI_LETTERS[n % 23] === s[8] };
  }
  if (/^[KLM]\d{7}[A-Z]$/.test(s)) return { normalised: s, kind: 'special', valid: entityControl(s.slice(1, 8)).letter === s[8] };
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(s)) {
    const { digit, letter } = entityControl(s.slice(1, 8));
    const last = s[8];
    const valid = LETTER_ONLY.includes(s[0]) ? last === letter : DIGIT_ONLY.includes(s[0]) ? last === digit : last === digit || last === letter;
    return { normalised: s, kind: 'entity', valid };
  }
  return { normalised: s, kind: null, valid: false };
}
