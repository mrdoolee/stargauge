import { describe, it, expect } from 'vitest';
import { droneFormation, droneShot, neededChargeColors } from '../../src/logic/drones.js';
import { fillFormationColors } from '../../src/logic/spawner.js';
import { piercingColors } from '../../src/logic/charge.js';
import { M3_STAR_POOL } from '../../src/config/balance.js';

const seeded = seed => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('droneShot', () => {
  const base = { drone: { x: 100, y: 400 }, ship: { x: 600, y: 1100 }, tier: 0, warmup: false, rng: Math.random };
  it('is null when the ship is inside the safe distance', () => {
    for (const diffKey of ['easy', 'normal', 'hard']) {
      expect(droneShot({ ...base, drone: { x: 300, y: 1090 }, ship: { x: 300, y: 1100 }, diffKey, aimAllowed: true })).toBeNull();
    }
  });
  it('easy and warm-up shoot straight down', () => {
    const e = droneShot({ ...base, diffKey: 'easy', aimAllowed: true });
    expect(e.vx).toBe(0);
    expect(e.vy).toBeGreaterThan(0);
    const w = droneShot({ ...base, diffKey: 'hard', aimAllowed: true, warmup: true });
    expect(w.vx).toBe(0);
    const n = droneShot({ ...base, diffKey: 'hard', aimAllowed: false });
    expect(n.vx).toBe(0);
  });
  it('hard aims toward the ship', () => {
    const s = droneShot({ ...base, diffKey: 'hard', aimAllowed: true });
    expect(Math.sign(s.vx)).toBe(1);
    expect(s.vy).toBeGreaterThan(0);
    const l = droneShot({ ...base, drone: { x: 650, y: 400 }, ship: { x: 100, y: 1100 }, diffKey: 'hard', aimAllowed: true });
    expect(Math.sign(l.vx)).toBe(-1);
  });
});

describe('neededChargeColors', () => {
  it('uses the highest shield', () => {
    expect(neededChargeColors(['white', 'blueWhite'])).toEqual(['blue', 'blueWhite']);
  });
  it('falls back to white without drones', () => {
    expect(neededChargeColors([])).toEqual(piercingColors('white'));
  });
});

describe('droneFormation', () => {
  it('1-3 drones, >=120 apart, inside bounds', () => {
    const rng = seeded(7);
    for (let i = 0; i < 500; i++) {
      const count = 1 + (i % 3);
      const f = droneFormation({ count, minX: 70, maxX: 650, rng });
      expect(f).toHaveLength(count);
      const xs = f.map(d => d.x).sort((a, b) => a - b);
      xs.forEach(x => { expect(x).toBeGreaterThanOrEqual(70); expect(x).toBeLessThanOrEqual(650); });
      for (let k = 1; k < xs.length; k++) expect(xs[k] - xs[k - 1]).toBeGreaterThanOrEqual(120);
      f.forEach(d => expect(d.enterDelayMs).toBeGreaterThanOrEqual(0));
    }
  });
  it('clamps count to 1..3', () => {
    expect(droneFormation({ count: 9, minX: 70, maxX: 650, rng: Math.random })).toHaveLength(3);
    expect(droneFormation({ count: 0, minX: 70, maxX: 650, rng: Math.random })).toHaveLength(1);
  });
});

describe('m3 star formations keep the needed color coming', () => {
  it('needed color is never missing for more than 3 formations in a row', () => {
    const rng = seeded(42);
    const needed = piercingColors('white');
    let since = 0;
    let streak = 0;
    let worst = 0;
    for (let i = 0; i < 200; i++) {
      const size = 3 + Math.floor(rng() * 3);
      const r = fillFormationColors({ slotCount: size, needed, all: M3_STAR_POOL, sinceNeeded: since, rng });
      since = r.sinceNeeded;
      streak = r.colors.some(c => needed.includes(c)) ? 0 : streak + 1;
      worst = Math.max(worst, streak);
    }
    expect(worst).toBeLessThanOrEqual(3);
  });
});
