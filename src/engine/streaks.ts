import type { Streak } from './types';

export function advanceStreak(current: Streak, date: string): Streak {
  const next = current.current + 1;

  return {
    ...current,
    current: next,
    best: Math.max(current.best, next),
    lastCompletionDate: date,
  };
}

export function missStreak(current: Streak): Streak {
  return {
    ...current,
    current: 0,
  };
}
