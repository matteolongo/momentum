import { describe, expect, it } from 'vitest';
import { buildRecoveryQuest, closeDay } from './checkin';

describe('checkin', () => {
  it('builds a recovery quest for the next day', () => {
    expect(buildRecoveryQuest('2026-08-06')).toEqual({
      id: expect.any(String),
      date: '2026-08-06',
      title: 'Invest in an ETF',
      stat: null,
      completed: false,
      completionTime: null,
    });
  });

  it('gives a perfect-day bonus when no core quest was missed', () => {
    expect(closeDay({ date: '2026-08-05', dayQuestXp: 100, coreMissed: false })).toEqual({
      perfectDayBonus: 25,
      recoveryQuest: null,
    });
  });

  it('creates a recovery quest when a core quest was missed', () => {
    expect(closeDay({ date: '2026-08-05', dayQuestXp: 100, coreMissed: true })).toEqual({
      perfectDayBonus: 0,
      recoveryQuest: {
        id: expect.any(String),
        date: '2026-08-06',
        title: 'Invest in an ETF',
        stat: null,
        completed: false,
        completionTime: null,
      },
    });
  });
});
