import {
  buildDaySchedule,
  clinicNow,
  formatClock,
  isBookableSlot,
  parseClock,
  parseOpdDays,
  parseTimeRange,
  weekdayOf,
} from './schedule';

// 2026-10-05 is a Monday. 07:00 UTC = 12:00 noon in Karachi.
const MON_NOON_PKT = new Date('2026-10-05T07:00:00Z');

describe('schedule utils', () => {
  it('parses day lists and ranges', () => {
    expect(parseOpdDays('Mon, Wed, Fri')).toEqual([1, 3, 5]);
    expect(parseOpdDays('Mon – Fri')).toEqual([1, 2, 3, 4, 5]);
    expect(parseOpdDays('Mon - Sat')).toEqual([1, 2, 3, 4, 5, 6]);
    expect(parseOpdDays('Tue, Thu, Sat')).toEqual([2, 4, 6]);
    expect(parseOpdDays('Fri to Mon')).toEqual([0, 1, 5, 6]);
    expect(parseOpdDays('Daily')).toHaveLength(7);
    expect(parseOpdDays('')).toHaveLength(7);
    expect(parseOpdDays('whenever')).toHaveLength(7);
  });

  it('parses and formats clock times', () => {
    expect(parseClock('05:00 PM')).toBe(17 * 60);
    expect(parseClock('12:30 AM')).toBe(30);
    expect(parseClock('12:00 PM')).toBe(12 * 60);
    expect(parseClock('9am')).toBe(9 * 60);
    expect(parseClock('25:00 PM')).toBeNull();
    expect(formatClock(17 * 60)).toBe('05:00 PM');
    expect(formatClock(0)).toBe('12:00 AM');
    expect(formatClock(12 * 60 + 30)).toBe('12:30 PM');
  });

  it('parses time ranges with fallbacks', () => {
    expect(parseTimeRange('05:00 PM – 09:00 PM')).toEqual({ start: 1020, end: 1260 });
    expect(parseTimeRange('10:00 AM - 02:00 PM')).toEqual({ start: 600, end: 840 });
    expect(parseTimeRange('nonsense')).toEqual({ start: 600, end: 1020 });
  });

  it('computes Pakistan time and weekdays', () => {
    expect(clinicNow(MON_NOON_PKT)).toEqual({ date: '2026-10-05', minutes: 720 });
    // 20:00 UTC on the 4th is already 01:00 on the 5th in Karachi.
    expect(clinicNow(new Date('2026-10-04T20:00:00Z')).date).toBe('2026-10-05');
    expect(weekdayOf('2026-10-05')).toBe(1);
  });

  const doctor = { opdSchedule: 'Mon, Wed, Fri', availableTime: '10:00 AM – 02:00 PM' };

  it('builds 30-minute slots and marks past ones today', () => {
    const day = buildDaySchedule(doctor, '2026-10-05', MON_NOON_PKT);
    expect(day.opdDay).toBe(true);
    expect(day.slots.map((s) => s.time)).toEqual([
      '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
      '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
    ]);
    expect(day.slots.filter((s) => s.past).map((s) => s.time)).toEqual([
      '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM',
    ]);
  });

  it('closes non-OPD days, past days and far-future days', () => {
    expect(buildDaySchedule(doctor, '2026-10-06', MON_NOON_PKT).opdDay).toBe(false); // Tue
    expect(buildDaySchedule(doctor, '2026-10-02', MON_NOON_PKT).closedReason).toMatch(/passed/);
    expect(buildDaySchedule(doctor, '2026-12-25', MON_NOON_PKT).closedReason).toMatch(/in advance/);
  });

  it('validates a requested slot', () => {
    expect(isBookableSlot(doctor, '2026-10-07', '10:00 AM', MON_NOON_PKT)).toEqual({ ok: true });
    expect(isBookableSlot(doctor, '2026-10-05', '10:00 AM', MON_NOON_PKT).ok).toBe(false);
    expect(isBookableSlot(doctor, '2026-10-07', '06:00 PM', MON_NOON_PKT).ok).toBe(false);
    expect(isBookableSlot(doctor, '2026-10-06', '10:00 AM', MON_NOON_PKT).ok).toBe(false);
  });
});
