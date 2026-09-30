/**
 * Turns a doctor's free-text OPD schedule into concrete bookable slots.
 *
 * Doctors type their schedule the way people do ("Mon, Wed, Fri",
 * "Mon – Sat", "05:00 PM – 09:00 PM"), so this parser is deliberately
 * forgiving. It is pure (no Nest / DB imports) and fully unit-tested.
 *
 * All "today / now" logic runs in Pakistan time (Asia/Karachi, UTC+5, no DST)
 * so the server and the patient agree on which slots are in the past.
 */

export const CLINIC_TIMEZONE = 'Asia/Karachi';
export const SLOT_MINUTES = 30;
export const BOOKING_WINDOW_DAYS = 30;

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DEFAULT_START = 10 * 60; // 10:00 AM
const DEFAULT_END = 17 * 60; // 05:00 PM

/** Parse "Mon, Wed, Fri" / "Mon – Fri" / "Daily" into weekday numbers (0 = Sun). */
export function parseOpdDays(text?: string | null): number[] {
  const all = [0, 1, 2, 3, 4, 5, 6];
  if (!text || !text.trim()) return all;
  const t = text.toLowerCase();
  if (/daily|every ?day|all days|7 days/.test(t)) return all;

  const days = new Set<number>();
  // Ranges like "mon - fri", "mon – sat", "mon to fri".
  const rangeRe = /(sun|mon|tue|wed|thu|fri|sat)[a-z]*\s*(?:-|–|—|to)\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*/g;
  let m: RegExpExecArray | null;
  let consumed = t;
  while ((m = rangeRe.exec(t)) !== null) {
    const a = DAY_KEYS.indexOf(m[1]);
    const b = DAY_KEYS.indexOf(m[2]);
    for (let i = a; ; i = (i + 1) % 7) {
      days.add(i);
      if (i === b) break;
    }
    consumed = consumed.replace(m[0], ' ');
  }
  // Single days anywhere else in the string.
  const singleRe = /(sun|mon|tue|wed|thu|fri|sat)[a-z]*/g;
  while ((m = singleRe.exec(consumed)) !== null) {
    days.add(DAY_KEYS.indexOf(m[1]));
  }
  return days.size ? [...days].sort((x, y) => x - y) : all;
}

/** "05:00 PM" -> 1020 (minutes since midnight). Returns null if unparseable. */
export function parseClock(text: string): number | null {
  const m = text.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (h < 1 || h > 12 || min > 59) return null;
  const pm = m[3].toLowerCase() === 'p';
  if (h === 12) h = 0;
  return (pm ? h + 12 : h) * 60 + min;
}

/** 1020 -> "05:00 PM" */
export function formatClock(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const min = minutes % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${suffix}`;
}

/** Parse "05:00 PM – 09:00 PM" into [start, end) minutes, with sane defaults. */
export function parseTimeRange(text?: string | null): { start: number; end: number } {
  if (text) {
    const parts = text.split(/\s*(?:-|–|—|to)\s*/i).filter(Boolean);
    if (parts.length >= 2) {
      const start = parseClock(parts[0]);
      const end = parseClock(parts[parts.length - 1]);
      if (start !== null && end !== null && end > start) return { start, end };
    }
  }
  return { start: DEFAULT_START, end: DEFAULT_END };
}

/** Current date (YYYY-MM-DD) and minutes-since-midnight in Pakistan time. */
export function clinicNow(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10),
  };
}

/** Weekday (0 = Sun) of a YYYY-MM-DD calendar date, timezone-independent. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Whole days from `a` to `b` (both YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

export interface SlotInfo {
  time: string;
  /** true when the slot has already started (only possible for today). */
  past: boolean;
}

export interface DaySchedule {
  date: string;
  opdDay: boolean;
  /** Human reason when the day is not bookable at all. */
  closedReason?: string;
  slots: SlotInfo[];
}

/** Build the bookable slots for one doctor on one date. */
export function buildDaySchedule(
  doctor: { opdSchedule?: string | null; availableTime?: string | null },
  date: string,
  now: Date = new Date(),
): DaySchedule {
  const today = clinicNow(now);
  const offset = daysBetween(today.date, date);

  if (Number.isNaN(offset) || offset < 0) {
    return { date, opdDay: false, closedReason: 'This date has already passed.', slots: [] };
  }
  if (offset > BOOKING_WINDOW_DAYS) {
    return {
      date,
      opdDay: false,
      closedReason: `Bookings open ${BOOKING_WINDOW_DAYS} days in advance.`,
      slots: [],
    };
  }

  const days = parseOpdDays(doctor.opdSchedule);
  if (!days.includes(weekdayOf(date))) {
    return { date, opdDay: false, closedReason: 'The doctor has no OPD on this day.', slots: [] };
  }

  const { start, end } = parseTimeRange(doctor.availableTime);
  const slots: SlotInfo[] = [];
  for (let t = start; t + SLOT_MINUTES <= end; t += SLOT_MINUTES) {
    slots.push({ time: formatClock(t), past: offset === 0 && t <= today.minutes });
  }
  return { date, opdDay: true, slots };
}

/** True if `time` is a real, future, in-schedule slot for this doctor/date. */
export function isBookableSlot(
  doctor: { opdSchedule?: string | null; availableTime?: string | null },
  date: string,
  time: string,
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: string } {
  const day = buildDaySchedule(doctor, date, now);
  if (!day.opdDay) return { ok: false, reason: day.closedReason ?? 'Not an OPD day.' };
  const slot = day.slots.find((s) => s.time === time);
  if (!slot) return { ok: false, reason: 'That time is outside the doctor\'s OPD hours.' };
  if (slot.past) return { ok: false, reason: 'That time slot has already passed.' };
  return { ok: true };
}
