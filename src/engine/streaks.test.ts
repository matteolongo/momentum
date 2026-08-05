import { describe, expect, it } from 'vitest';
import { advanceStreak, missStreak } from './streaks';
import type { Streak } from './types';

describe('streaks', () => {
  it('advances a streak without touching its best record', () => {
    const current: Streak = { habitId: 'habit-1', current: 2, best: 3, lastCompletionDate: '2026-08-04' };

    expect(advanceStreak(current, '2026-08-05')).toEqual({
      habitId: 'habit-1',
      current: 3,
      best: 3,
      lastCompletionDate: '2026-08-05',
    });
  });

  it('missed day resets only the current streak', () => {
    const current: Streak = { habitId: 'habit-1', current: 5, best: 7, lastCompletionDate: '2026-08-04' };

    expect(missStreak(current)).toEqual({
      habitId: 'habit-1',
      current: 0,
      best: 7,
      lastCompletionDate: '2026-08-04',
    });
  });
});
