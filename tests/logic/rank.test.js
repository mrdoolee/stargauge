import { describe, it, expect } from 'vitest';
import { createRank } from '../../src/logic/rank.js';
import { RANK_START, RANK_SURVIVAL, RANK_AIM_MIN, RANK_TIER_AT } from '../../src/config/balance.js';

describe('rank', () => {
  it('easy: tier stays 0 and aim stays off forever', () => {
    const r = createRank({ diffKey: 'easy', restarts: 0 });
    r.update(600000);
    for (let i = 0; i < 50; i++) r.onCorrect();
    expect(r.tier).toBe(0);
    expect(r.aimAllowed).toBe(false);
  });

  it('normal: survival steps after 30 s then every 20 s', () => {
    const r = createRank({ diffKey: 'normal', restarts: 0 });
    r.update(RANK_SURVIVAL.firstStepMs - 1);
    expect(r.value).toBe(RANK_START.normal);
    r.update(1);
    expect(r.value).toBe(RANK_START.normal + 1);
    r.update(RANK_SURVIVAL.stepMs);
    expect(r.value).toBe(RANK_START.normal + 2);
    r.update(10 * 600000);
    expect(r.value).toBe(RANK_START.normal + RANK_SURVIVAL.maxSteps);
  });

  it('hard starts higher than normal', () => {
    const n = createRank({ diffKey: 'normal', restarts: 0 });
    const h = createRank({ diffKey: 'hard', restarts: 0 });
    expect(h.value).toBeGreaterThan(n.value);
    expect(h.tier).toBeGreaterThanOrEqual(n.tier);
  });

  it('mercy: each restart lowers the start, capped at 2 restarts', () => {
    const v = n => createRank({ diffKey: 'normal', restarts: n }).value;
    expect([v(0), v(1), v(2), v(5)]).toEqual([2, 0, -2, -2]);
    expect(createRank({ diffKey: 'normal', restarts: 5 }).tier).toBe(0);
  });

  it('tier is monotonic in value and bounded 0..3', () => {
    const r = createRank({ diffKey: 'hard', restarts: 0 });
    let prev = r.tier;
    for (let i = 0; i < 60; i++) {
      r.onCorrect();
      expect(r.tier).toBeGreaterThanOrEqual(prev);
      expect(r.tier).toBeLessThanOrEqual(3);
      prev = r.tier;
    }
    expect(prev).toBe(RANK_TIER_AT.length - 1);
  });

  it('aimAllowed only when value >= RANK_AIM_MIN and not easy', () => {
    const h = createRank({ diffKey: 'hard', restarts: 0 });
    expect(h.value >= RANK_AIM_MIN).toBe(true);
    expect(h.aimAllowed).toBe(true);
    const n = createRank({ diffKey: 'normal', restarts: 0 });
    expect(n.aimAllowed).toBe(false);
    for (let i = 0; i < 4; i++) n.onCorrect();
    expect(n.aimAllowed).toBe(true);
  });
});
