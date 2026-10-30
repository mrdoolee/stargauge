import { describe, it, expect } from 'vitest';
import { pickSpawnColor, Spawner } from '../../src/logic/spawner.js';

const all = ['blue', 'white', 'red'];

describe('pickSpawnColor', () => {
  it('forces needed after 3 misses', () => {
    expect(pickSpawnColor({ needed: ['blue'], all, sinceNeeded: 3, rng: () => 0.99 })).toBe('blue');
  });
  it('picks from all otherwise, guarding index', () => {
    expect(pickSpawnColor({ needed: ['blue'], all, sinceNeeded: 0, rng: () => 0.99 })).toBe('red');
    expect(pickSpawnColor({ needed: ['blue'], all, sinceNeeded: 0, rng: () => 0 })).toBe('blue');
  });
  it('empty needed uses all', () => {
    expect(all).toContain(pickSpawnColor({ needed: [], all, sinceNeeded: 9, rng: () => 0.5 }));
  });
});

describe('Spawner', () => {
  it('caps at 1 per update', () => {
    expect(new Spawner({ intervalMs: 800 }).update(5000)).toBeLessThanOrEqual(1);
    expect(new Spawner({ intervalMs: 50 }).update(5000)).toBe(1);
  });
  it('spawns after accumulating interval', () => {
    const s = new Spawner({ intervalMs: 200 });
    expect(s.update(100)).toBe(0);
    expect(s.update(100)).toBe(1);
    expect(s.update(100)).toBe(0);
  });
});

import { spawnXAwayFrom } from '../../src/logic/spawner.js';
import { M2_SPAWN_MIN_GAP_X } from '../../src/config/balance.js';

describe('spawnXAwayFrom', () => {
  const opts = rng => ({ min: 70, max: 650, minGap: 120, rng });

  it('without a previous x it is uniform over [min, max]', () => {
    expect(spawnXAwayFrom(null, opts(() => 0))).toBe(70);
    expect(spawnXAwayFrom(null, opts(() => 0.999999))).toBeCloseTo(650, 2);
  });

  it('always lands >= minGap from the previous x, inside [min, max]', () => {
    for (const prev of [70, 100, 200, 360, 500, 640, 650]) {
      for (let k = 0; k <= 100; k++) {
        const x = spawnXAwayFrom(prev, opts(() => Math.min(k / 100, 0.999999)));
        expect(Math.abs(x - prev)).toBeGreaterThanOrEqual(120 - 1e-9);
        expect(x).toBeGreaterThanOrEqual(70);
        expect(x).toBeLessThanOrEqual(650);
      }
    }
  });

  it('covers both sides of the previous x', () => {
    const lo = spawnXAwayFrom(360, opts(() => 0));
    const hi = spawnXAwayFrom(360, opts(() => 0.999999));
    expect(lo).toBeLessThan(360);
    expect(hi).toBeGreaterThan(360);
  });

  it('falls back to the farthest edge when no x is far enough', () => {
    expect(spawnXAwayFrom(100, { min: 70, max: 150, minGap: 120, rng: () => 0.5 })).toBe(150);
  });

  it('m2 uses a gap of about 120 px', () => {
    expect(M2_SPAWN_MIN_GAP_X).toBeGreaterThanOrEqual(120);
  });
});
