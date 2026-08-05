import { dayIndex } from './dates';
import { newId, type DailyQuest, type Habit } from './types';

const MAX_CORE = 3;
const MAX_BONUS = 2;

export function generateQuests(habits: Habit[], date: string, existing: DailyQuest[] = []): DailyQuest[] {
  if (existing.length > 0) {
    return existing;
  }

  const active = habits.filter((habit) => habit.active);
  const core = active.filter((habit) => habit.core);
  const bonus = active.filter((habit) => !habit.core);
  const offset = core.length === 0 ? 0 : dayIndex(date) % core.length;
  const rotated = core.slice(offset).concat(core.slice(0, offset));

  return [
    ...rotated.slice(0, MAX_CORE),
    ...bonus.slice(0, MAX_BONUS),
  ].map((habit) => ({
    id: newId(),
    habitId: habit.id,
    date,
    core: habit.core,
    completed: false,
    completionTime: null,
  }));
}
