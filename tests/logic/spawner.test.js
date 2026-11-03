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

import { fillFormationColors } from '../../src/logic/spawner.js';

describe('fillFormationColors', () => {
  const ALL = ['blue', 'blueWhite', 'white', 'yellowWhite', 'yellow', 'orange', 'red'];
  const rng0 = () => 0; // always picks index 0 -> 'blue' (not needed below)
  it('one color per slot, all drawn from `all`', () => {
    const { colors } = fillFormationColors({ slotCount: 5, needed: ['red'], all: ALL, sinceNeeded: 0, rng: Math.random });
    expect(colors).toHaveLength(5);
    for (const c of colors) expect(ALL).toContain(c);
  });
  it('forces a needed color once 3 formations in a row had none', () => {
    let since = 0;
    let streak = 0;
    for (let n = 0; n < 200; n++) {
      const r = fillFormationColors({ slotCount: 3, needed: ['red'], all: ALL, sinceNeeded: since, rng: Math.random });
      const has = r.colors.includes('red');
      streak = has ? 0 : streak + 1;
      expect(streak).toBeLessThanOrEqual(3);
      since = r.sinceNeeded;
    }
  });
  it('sinceNeeded+1 >= guarantee swaps exactly one random slot to a needed color', () => {
    const r = fillFormationColors({ slotCount: 4, needed: ['red'], all: ALL, sinceNeeded: 2, rng: rng0 });
    expect(r.colors.filter(c => c === 'red')).toHaveLength(1);
    expect(r.sinceNeeded).toBe(0);
  });
  it('resets sinceNeeded to 0 when a needed color is present, else +1', () => {
    expect(fillFormationColors({ slotCount: 3, needed: ['blue'], all: ALL, sinceNeeded: 0, rng: rng0 }).sinceNeeded).toBe(0);
    expect(fillFormationColors({ slotCount: 3, needed: ['red'], all: ALL, sinceNeeded: 0, rng: rng0 }).sinceNeeded).toBe(1);
  });
  it('empty needed never forces', () => {
    const r = fillFormationColors({ slotCount: 3, needed: [], all: ALL, sinceNeeded: 9, rng: rng0 });
    expect(r.colors).toEqual(['blue', 'blue', 'blue']);
    expect(r.sinceNeeded).toBe(10);
  });
});
