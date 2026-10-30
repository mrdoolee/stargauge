import { describe, it, expect } from 'vitest';
import { furnaceStageAt } from '../../src/logic/furnace.js';
import { FURNACE_STAGE_CUTS } from '../../src/config/balance.js';

describe('furnaceStageAt', () => {
  it('starts white and ends red', () => {
    expect(furnaceStageAt(0)).toBe('white');
    expect(furnaceStageAt(1)).toBe('red');
    expect(furnaceStageAt(5)).toBe('red');
    expect(furnaceStageAt(-1)).toBe('white');
  });
  it('steps white -> yellow -> orange -> red at the cut points', () => {
    const [a, b, c] = FURNACE_STAGE_CUTS;
    expect(furnaceStageAt(a - 0.001)).toBe('white');
    expect(furnaceStageAt(a)).toBe('yellow');
    expect(furnaceStageAt(b - 0.001)).toBe('yellow');
    expect(furnaceStageAt(b)).toBe('orange');
    expect(furnaceStageAt(c - 0.001)).toBe('orange');
    expect(furnaceStageAt(c)).toBe('red');
  });
  it('is monotonic', () => {
    const rank = { white: 0, yellow: 1, orange: 2, red: 3 };
    let prev = 0;
    for (let f = 0; f <= 1; f += 0.01) {
      const r = rank[furnaceStageAt(f)];
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
  });
});
