import { describe, expect, it } from 'vitest';
import { addDays, lastNDays, toDayStamp, tomorrow, weekStart, yesterday } from './dates';

describe('dates', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toDayStamp(new Date(2026, 7, 5))).toBe('2026-08-05');
  });

  it('adds and subtracts days', () => {
    expect(addDays('2026-08-05', 1)).toBe('2026-08-06');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(yesterday('2026-08-05')).toBe('2026-08-04');
    expect(tomorrow('2026-08-05')).toBe('2026-08-06');
  });

  it('returns the Monday of the current week', () => {
    expect(weekStart('2026-08-05')).toBe('2026-08-03');
    expect(weekStart('2026-08-03')).toBe('2026-08-03');
  });

  it('lists the last n local dates ending with the given day', () => {
    expect(lastNDays('2026-08-05', 3)).toEqual(['2026-08-03', '2026-08-04', '2026-08-05']);
  });
});
