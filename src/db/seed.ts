import { newId, type Habit } from '../engine';
import { createDb, type MomentumDB } from './index';

export const DEFAULT_HABITS: Habit[] = [
  { id: newId(), name: 'No smoking', category: 'Sobriety', difficulty: 'hard', xp: 50, core: true, active: true, createdAt: '2026-08-05' },
  { id: newId(), name: 'Workout', category: 'Training', difficulty: 'medium', xp: 25, core: true, active: true, createdAt: '2026-08-05' },
  { id: newId(), name: 'Sleep before midnight', category: 'Sleep', difficulty: 'easy', xp: 10, core: true, active: true, createdAt: '2026-08-05' },
  { id: newId(), name: 'Read 10 pages', category: 'Reading', difficulty: 'easy', xp: 10, core: false, active: true, createdAt: '2026-08-05' },
  { id: newId(), name: 'Journal', category: 'Meditation', difficulty: 'easy', xp: 10, core: false, active: true, createdAt: '2026-08-05' },
];

export async function seedIfNeeded(db: MomentumDB = createDb()): Promise<void> {
  await db.transaction('rw', db.habits, db.meta, async () => {
    const seeded = await db.meta.get('seeded');
    if (seeded?.value === 'true') {
      return;
    }

    if ((await db.habits.count()) === 0) {
      await db.habits.bulkAdd(DEFAULT_HABITS);
    }

    await db.meta.put({ key: 'seeded', value: 'true' });
    await db.meta.put({ key: 'theme', value: 'career-man' });
  });
}
