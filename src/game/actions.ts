import { generateQuests } from '../engine';
import type { DailyQuest, Habit } from '../engine';

type RepoShape = {
  habits: {
    all: () => Promise<Habit[]>;
  };
  quests: {
    forDate: (date: string) => Promise<DailyQuest[]>;
    put: (quest: DailyQuest) => Promise<void>;
    get: (id: string) => Promise<DailyQuest | undefined>;
    complete: (id: string, completionTime: string) => Promise<boolean>;
  };
};

export async function ensureQuestsForDate(repos: RepoShape, date: string): Promise<DailyQuest[]> {
  const existing = await repos.quests.forDate(date);
  if (existing.length > 0) {
    return existing;
  }

  const quests = generateQuests(await repos.habits.all(), date);
  for (const quest of quests) {
    await repos.quests.put(quest);
  }

  return quests;
}

export async function completeQuest(repos: RepoShape, questId: string, completionTime = new Date().toISOString()): Promise<boolean> {
  const quest = await repos.quests.get(questId);
  if (!quest || quest.completed) {
    return false;
  }

  return repos.quests.complete(questId, completionTime);
}
