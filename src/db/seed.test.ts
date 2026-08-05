import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from './index';
import { DEFAULT_HABITS, seedIfNeeded } from './seed';

const dbName = `momentum-seed-${crypto.randomUUID()}`;

afterEach(async () => {
  const db = createDb(dbName);
  db.close();
  await db.delete();
});

describe('seedIfNeeded', () => {
  it('seeds default habits only once', async () => {
    const db = createDb(dbName);

    await seedIfNeeded(db);
    expect(await db.habits.count()).toBe(DEFAULT_HABITS.length);

    await seedIfNeeded(db);
    expect(await db.habits.count()).toBe(DEFAULT_HABITS.length);
    expect((await db.meta.get('seeded'))?.value).toBe('true');
    db.close();
  });
});
