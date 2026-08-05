import { describe, expect, it } from 'vitest';
import { completeQuest, ensureQuestsForDate } from './actions';
import type { Habit, DailyQuest } from '../engine';

function createRepos() {
  const habits: Habit[] = [
    { id: 'c1', name: 'Core 1', category: 'Productivity', difficulty: 'easy', xp: 10, core: true, active: true, createdAt: '2026-08-01' },
    { id: 'c2', name: 'Core 2', category: 'Training', difficulty: 'easy', xp: 10, core: true, active: true, createdAt: '2026-08-02' },
    { id: 'c3', name: 'Core 3', category: 'Nutrition', difficulty: 'easy', xp: 10, core: true, active: true, createdAt: '2026-08-03' },
    { id: 'b1', name: 'Bonus 1', category: 'Reading', difficulty: 'medium', xp: 25, core: false, active: true, createdAt: '2026-08-01' },
  ];
  const quests = new Map<string, DailyQuest>();

  return {
    habits: {
      all: async () => habits,
    },
    quests: {
      forDate: async (date: string) => Array.from(quests.values()).filter((quest) => quest.date === date),
      put: async (quest: DailyQuest) => {
        quests.set(quest.id, quest);
      },
      get: async (id: string) => quests.get(id),
      complete: async (id: string, completionTime: string) => {
        const quest = quests.get(id);
        if (!quest) {
          return false;
        }
        quests.set(id, { ...quest, completed: true, completionTime });
        return true;
      },
    },
  };
}

describe('actions', () => {
  it('generates quests once per day', async () => {
    const repos = createRepos();

    const first = await ensureQuestsForDate(repos, '2026-08-05');
    const second = await ensureQuestsForDate(repos, '2026-08-05');

    expect(first).toHaveLength(4);
    expect(second).toHaveLength(4);
  });

  it('ignores a double completion', async () => {
    const repos = createRepos();
    const [quest] = await ensureQuestsForDate(repos, '2026-08-05');

    expect(await completeQuest(repos, quest.id, '2026-08-05T12:00:00.000Z')).toBe(true);
    expect(await completeQuest(repos, quest.id, '2026-08-05T12:00:00.000Z')).toBe(false);
  });
});
