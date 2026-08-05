import { describe, expect, it } from 'vitest';
import { generateQuests } from './quests';
import type { Habit, DailyQuest } from './types';

const habits: Habit[] = [
  { id: 'c1', name: 'Core 1', category: 'Productivity', difficulty: 'easy', xp: 10, core: true, active: true, createdAt: '2026-08-01' },
  { id: 'c2', name: 'Core 2', category: 'Training', difficulty: 'easy', xp: 10, core: true, active: true, createdAt: '2026-08-02' },
  { id: 'c3', name: 'Core 3', category: 'Nutrition', difficulty: 'easy', xp: 10, core: true, active: true, createdAt: '2026-08-03' },
  { id: 'c4', name: 'Core 4', category: 'Sleep', difficulty: 'easy', xp: 10, core: true, active: true, createdAt: '2026-08-04' },
  { id: 'b1', name: 'Bonus 1', category: 'Reading', difficulty: 'medium', xp: 25, core: false, active: true, createdAt: '2026-08-01' },
  { id: 'b2', name: 'Bonus 2', category: 'Music', difficulty: 'medium', xp: 25, core: false, active: true, createdAt: '2026-08-02' },
  { id: 'b3', name: 'Bonus 3', category: 'Meditation', difficulty: 'medium', xp: 25, core: false, active: true, createdAt: '2026-08-03' },
];

describe('generateQuests', () => {
  it('limits the day to three core quests and two bonus quests', () => {
    const quests = generateQuests(habits, '2026-08-05');

    expect(quests).toHaveLength(5);
    expect(quests.filter((quest) => quest.core)).toHaveLength(3);
    expect(quests.filter((quest) => !quest.core)).toHaveLength(2);
  });

  it('rotates core quests across days', () => {
    const today = generateQuests(habits, '2026-08-05');
    const tomorrow = generateQuests(habits, '2026-08-06');

    expect(today.filter((quest) => quest.core).map((quest) => quest.habitId)).not.toEqual(
      tomorrow.filter((quest) => quest.core).map((quest) => quest.habitId),
    );
  });

  it('returns existing quests unchanged when the day already has quests', () => {
    const existing: DailyQuest[] = [
      { id: 'q1', habitId: 'c1', date: '2026-08-05', core: true, completed: false, completionTime: null },
    ];

    expect(generateQuests(habits, '2026-08-05', existing)).toBe(existing);
  });
});
