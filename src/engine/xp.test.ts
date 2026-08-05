import { describe, expect, it } from 'vitest';
import { levelForXp, perfectDayBonus, streakMultiplier, xpForDifficulty, xpToNextLevel } from './xp';

describe('xp', () => {
  it('maps difficulty to base xp', () => {
    expect(xpForDifficulty('easy')).toBe(10);
    expect(xpForDifficulty('medium')).toBe(25);
    expect(xpForDifficulty('hard')).toBe(50);
    expect(xpForDifficulty('epic')).toBe(100);
  });

  it('derives level from total xp', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(250)).toBe(3);
  });

  it('reports progress to the next level', () => {
    expect(xpToNextLevel(0)).toEqual({ level: 1, current: 0, next: 100, progress: 0 });
    expect(xpToNextLevel(120)).toEqual({ level: 2, current: 120, next: 250, progress: 0.13333333333333333 });
  });

  it('applies the perfect-day bonus and streak multiplier', () => {
    expect(perfectDayBonus(100)).toBe(25);
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(7)).toBe(1.1);
    expect(streakMultiplier(35)).toBe(1.5);
  });
});
