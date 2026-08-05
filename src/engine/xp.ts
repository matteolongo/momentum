import type { Difficulty } from './types';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000];

export function xpForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return 10;
    case 'medium':
      return 25;
    case 'hard':
      return 50;
    case 'epic':
      return 100;
  }
}

export function levelForXp(totalXp: number): number {
  let level = 1;
  for (let index = 0; index < LEVEL_THRESHOLDS.length; index += 1) {
    if (totalXp >= LEVEL_THRESHOLDS[index]) {
      level = index + 1;
    }
  }
  return level;
}

export function xpToNextLevel(totalXp: number) {
  const level = levelForXp(totalXp);
  const current = LEVEL_THRESHOLDS[level - 1] ?? LEVEL_THRESHOLDS.at(-1) ?? 0;
  const next = LEVEL_THRESHOLDS[level] ?? null;

  return {
    level,
    current: totalXp,
    next,
    progress: next === null ? 1 : (totalXp - current) / (next - current),
  };
}

export function perfectDayBonus(dayQuestXp: number): number {
  return Math.round(dayQuestXp * 0.25);
}

export function streakMultiplier(currentStreak: number): number {
  return 1 + Math.min(Math.floor(currentStreak / 7) * 0.1, 0.5);
}
