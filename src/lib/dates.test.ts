import { addDaysKey, dayTitle, toKey, todayKey } from './dates';

describe('toKey', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    expect(toKey(new Date(2026, 6, 15))).toBe('2026-07-15');
  });

  it('pads single-digit month and day', () => {
    expect(toKey(new Date(2026, 0, 3))).toBe('2026-01-03');
  });
});

describe('todayKey', () => {
  it('matches the key format', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('addDaysKey', () => {
  it('adds days', () => {
    expect(addDaysKey('2026-07-15', 1)).toBe('2026-07-16');
  });

  it('subtracts across a year boundary', () => {
    expect(addDaysKey('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('crosses months forward', () => {
    expect(addDaysKey('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('dayTitle', () => {
  const base = '2026-07-15';

  it('labels the base date TODAY', () => {
    expect(dayTitle('2026-07-15', base)).toBe('TODAY');
  });

  it('labels one day back YESTERDAY', () => {
    expect(dayTitle('2026-07-14', base)).toBe('YESTERDAY');
  });

  it('labels one day ahead TOMORROW', () => {
    expect(dayTitle('2026-07-16', base)).toBe('TOMORROW');
  });

  it('labels other days as weekday and date', () => {
    expect(dayTitle('2026-07-10', base)).toBe('FRI · JUL 10');
  });
});
