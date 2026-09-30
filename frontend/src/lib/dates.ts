/**
 * Date helpers that work in the clinic's time zone (Pakistan), so a patient
 * booking at 1 AM sees the right "today" — `toISOString()` would give UTC.
 */
export const CLINIC_TZ = 'Asia/Karachi';

/** YYYY-MM-DD for "today + offset days" in Pakistan time. */
export function clinicDate(offsetDays = 0, now = new Date()): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + offsetDays)).toISOString().slice(0, 10);
}

/** Format a YYYY-MM-DD calendar date without time-zone drift. */
export function formatDay(
  date: string,
  opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' },
): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
}
