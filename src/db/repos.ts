import type { DailyQuest, Habit, RecoveryQuest, Streak } from '../engine';
import type { MomentumDB, UnlockEvent, XPTransaction } from './index';

export function createRepos(db: MomentumDB) {
  return {
    habits: {
      all: () => db.habits.toArray(),
      get: (id: string) => db.habits.get(id),
      put: (habit: Habit) => db.habits.put(habit),
      remove: (id: string) => db.habits.delete(id),
      count: () => db.habits.count(),
    },
    quests: {
      forDate: (date: string) => db.quests.where('date').equals(date).sortBy('habitId'),
      put: (quest: DailyQuest) => db.quests.put(quest),
      get: (id: string) => db.quests.get(id),
      remove: (id: string) => db.quests.delete(id),
      complete: async (id: string, completionTime: string) =>
        db.quests.update(id, { completed: true, completionTime }),
    },
    streaks: {
      get: (habitId: string) => db.streaks.get(habitId),
      put: (streak: Streak) => db.streaks.put(streak),
    },
    checkins: {
      forDate: (date: string) => db.checkins.where('date').equals(date).first(),
      put: (checkin: { id: string; date: string; mood: number; energy: number; cravings: boolean; notes: string; completed: boolean; recoveryQuestGenerated: boolean }) =>
        db.checkins.put(checkin),
    },
    recoveryQuests: {
      forDate: (date: string) => db.recoveryQuests.where('date').equals(date).first(),
      put: (quest: RecoveryQuest) => db.recoveryQuests.put(quest),
      complete: async (id: string, completionTime: string) =>
        db.recoveryQuests.update(id, { completed: true, completionTime }),
    },
    xpTransactions: {
      add: (tx: XPTransaction) => db.xpTransactions.put(tx),
      hasReason: async (reason: string) => (await db.xpTransactions.where('reason').equals(reason).count()) > 0,
      byReason: (reason: string) => db.xpTransactions.where('reason').equals(reason).toArray(),
    },
    unlockEvents: {
      all: () => db.unlockEvents.toArray(),
      add: (event: UnlockEvent) => db.unlockEvents.put(event),
    },
    meta: {
      get: (key: string) => db.meta.get(key),
      put: (key: string, value: string) => db.meta.put({ key, value }),
    },
  };
}
