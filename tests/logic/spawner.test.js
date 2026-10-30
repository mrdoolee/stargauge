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
