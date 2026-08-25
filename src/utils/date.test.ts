import {
  daysBetween,
  endOfDayMs,
  formatDate,
  formatMonthLabel,
  shiftDateInput,
  startOfDayMs,
  toDateInputValue,
  toMonthKey,
} from './date';

describe('startOfDayMs / endOfDayMs', () => {
  it('anchors to UTC midnight', () => {
    expect(startOfDayMs('2025-03-14')).toBe(Date.parse('2025-03-14T00:00:00.000Z'));
  });

  it('makes the upper bound inclusive of the whole day', () => {
    expect(endOfDayMs('2025-03-14')).toBe(Date.parse('2025-03-14T23:59:59.999Z'));
  });

  it('treats empty and malformed values as unbounded', () => {
    expect(startOfDayMs('')).toBeNull();
    expect(startOfDayMs('not-a-date')).toBeNull();
    expect(endOfDayMs('')).toBeNull();
  });
});

describe('toMonthKey', () => {
  it('groups by calendar month in UTC', () => {
    expect(toMonthKey(Date.parse('2025-03-14T23:30:00.000Z'))).toBe('2025-03');
    expect(toMonthKey(Date.parse('2025-01-01T00:00:00.000Z'))).toBe('2025-01');
  });
});

describe('toDateInputValue', () => {
  it('formats for <input type="date">', () => {
    expect(toDateInputValue(Date.parse('2025-12-31T18:00:00.000Z'))).toBe('2025-12-31');
  });
});

describe('shiftDateInput', () => {
  it('moves by whole days and keeps the format', () => {
    expect(shiftDateInput('2025-12-31', -30)).toBe('2025-12-01');
    expect(shiftDateInput('2025-01-01', -1)).toBe('2024-12-31');
    expect(shiftDateInput('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(shiftDateInput('nonsense', -30)).toBe('nonsense');
  });
});

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween(Date.parse('2025-01-01T00:00:00Z'), Date.parse('2025-01-31T00:00:00Z'))).toBe(30);
  });

  it('never returns less than a day', () => {
    const now = Date.parse('2025-01-01T00:00:00Z');
    expect(daysBetween(now, now)).toBe(1);
  });
});

describe('display formatting', () => {
  it('formats dates in UTC regardless of the host timezone', () => {
    expect(formatDate(Date.parse('2025-03-14T23:30:00.000Z'))).toBe('14 Mar 2025');
  });

  it('labels months from a month key', () => {
    expect(formatMonthLabel('2025-03')).toBe('Mar 25');
  });
});
