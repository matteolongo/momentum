export type Difficulty = 'easy' | 'medium' | 'hard' | 'epic';

export type Category =
  | 'Sobriety'
  | 'Training'
  | 'Nutrition'
  | 'Sleep'
  | 'Reading'
  | 'Music'
  | 'Meditation'
  | 'Productivity'
  | 'Finance'
  | 'Custom';

export interface Habit {
  id: string;
  name: string;
  category: Category;
  difficulty: Difficulty;
  xp: number;
  core: boolean;
  active: boolean;
  createdAt: string;
}

export interface DailyQuest {
  id: string;
  habitId: string;
  date: string;
  core: boolean;
  completed: boolean;
  completionTime: string | null;
}

export interface Streak {
  habitId: string;
  current: number;
  best: number;
  lastCompletionDate: string | null;
}

export interface RecoveryQuest {
  id: string;
  date: string;
  title: string;
  stat: string | null;
  completed: boolean;
  completionTime: string | null;
}

export function newId() {
  return globalThis.crypto.randomUUID();
}
