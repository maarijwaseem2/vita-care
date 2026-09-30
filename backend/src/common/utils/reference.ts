import { randomInt } from 'crypto';

// No 0/O/1/I/L so references are easy to read out over the phone.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Random booking reference like "VC-7K2M9QXA" (31^8 ≈ 8.5e11 combinations). */
export function newReference(): string {
  let code = '';
  for (let i = 0; i < 8; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `VC-${code}`;
}
