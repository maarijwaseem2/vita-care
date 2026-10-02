/** Keep only characters a phone number can contain (letters are dropped as you type). */
export const cleanPhoneInput = (v: string) => v.replace(/[^\d+\-\s()]/g, '').slice(0, 18);

/** Same rule as the server: Pakistani mobiles (03001234567, +92 300 1234567) and landlines. */
export function isPkPhone(v: string): boolean {
  return /^(?:\+92|0092|92|0)(?:3\d{9}|[1-9]\d{8,9})$/.test(v.replace(/[\s\-()]/g, ''));
}

export const PHONE_HELP = 'Enter a valid Pakistani phone number, e.g. 03001234567';
