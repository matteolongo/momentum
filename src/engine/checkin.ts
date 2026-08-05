import { addDays } from './dates';
import { newId, type RecoveryQuest } from './types';
import { perfectDayBonus } from './xp';

const RECOVERY_POOL = [
  'Invest in an ETF',
  'Walk 20 min',
  'Drink 2L water',
  'Journal 10 min',
];

export function buildRecoveryQuest(date: string, stat: string | null = null, rotationIndex = 0): RecoveryQuest {
  const title = RECOVERY_POOL[Math.abs(rotationIndex) % RECOVERY_POOL.length];

  return {
    id: newId(),
    date,
    title,
    stat,
    completed: false,
    completionTime: null,
  };
}

export function closeDay(input: { date: string; dayQuestXp: number; coreMissed: boolean; rotationIndex?: number }) {
  const recoveryQuest = input.coreMissed
    ? buildRecoveryQuest(addDays(input.date, 1), null, input.rotationIndex)
    : null;

  return {
    perfectDayBonus: input.coreMissed ? 0 : perfectDayBonus(input.dayQuestXp),
    recoveryQuest,
  };
}
