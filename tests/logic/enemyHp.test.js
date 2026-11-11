import { describe, it, expect } from 'vitest';
import { hpBarFraction } from '../../src/logic/enemyHp.js';

describe('hpBarFraction', () => {
  it('is hp / maxHp clamped to 0..1', () => {
    expect(hpBarFraction(3, 3)).toBe(1);
    expect(hpBarFraction(2, 3)).toBeCloseTo(2 / 3, 6);
    expect(hpBarFraction(0, 3)).toBe(0);
    expect(hpBarFraction(5, 3)).toBe(1);
  });
  it('is 0 for negative hp or a non-positive max', () => {
    expect(hpBarFraction(-1, 3)).toBe(0);
    expect(hpBarFraction(1, 0)).toBe(0);
    expect(hpBarFraction(1, -2)).toBe(0);
  });
});

import { hpBarY } from '../../src/logic/enemyHp.js';

describe('hpBarY', () => {
  it('sits above the enemy when it stays below the HUD band', () => {
    expect(hpBarY(600, -60, 8, 344)).toBe(540);
  });
  it('flips below the enemy when the top position would reach the HUD band', () => {
    expect(hpBarY(380, -60, 8, 344)).toBe(440);
  });
  it('stays above when the bar top is exactly on the band edge', () => {
    expect(hpBarY(408, -60, 8, 344)).toBe(348 - 0); // 348 - 4 = 344 top
  });
});

import { hpBarOffsetY } from '../../src/logic/enemyHp.js';
import { HP_BAR_GAP, HP_BAR_H } from '../../src/config/balance.js';

describe('hpBarOffsetY', () => {
  it('puts the bar HP_BAR_GAP above the larger of the body and the shield ring (negative = above)', () => {
    expect(hpBarOffsetY(40, 51.2)).toBeCloseTo(-(51.2 + HP_BAR_GAP + HP_BAR_H / 2), 6);
    expect(hpBarOffsetY(60, 10)).toBeCloseTo(-(60 + HP_BAR_GAP + HP_BAR_H / 2), 6);
  });
});
