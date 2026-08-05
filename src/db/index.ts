import Dexie, { type Table } from 'dexie';
import type { DailyQuest, Habit, RecoveryQuest, Streak } from '../engine';

export interface XPTransaction {
  id: string;
  amount: number;
  reason: string;
  questId: string | null;
  stat: string | null;
  timestamp: string;
}

export interface UnlockEvent {
  id: string;
  itemId: string;
  level: number;
  unlockedAt: string;
}

export interface MetaEntry {
  key: string;
  value: string;
}

export class MomentumDB extends Dexie {
  habits!: Table<Habit, string>;
  quests!: Table<DailyQuest, string>;
  xpTransactions!: Table<XPTransaction, string>;
  streaks!: Table<Streak, string>;
  checkins!: Table<{ id: string; date: string; mood: number; energy: number; cravings: boolean; notes: string; completed: boolean; recoveryQuestGenerated: boolean }, string>;
  recoveryQuests!: Table<RecoveryQuest, string>;
  unlockEvents!: Table<UnlockEvent, string>;
  meta!: Table<MetaEntry, string>;

  constructor(name = 'momentum') {
    super(name);

    this.version(1).stores({
      habits: 'id, active, core, category, createdAt',
      quests: 'id, date, habitId, completed',
      xpTransactions: 'id, timestamp, reason, stat',
      streaks: 'habitId',
      checkins: 'id, date',
      recoveryQuests: 'id, date, completed',
      unlockEvents: 'id, level, unlockedAt',
      meta: 'key',
    });
  }
}

export function createDb(name = 'momentum'): MomentumDB {
  return new MomentumDB(name);
}
