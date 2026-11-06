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
