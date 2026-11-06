import { describe, it, expect } from 'vitest';
import { droneFormation, droneShot, neededChargeColors } from '../../src/logic/drones.js';
import { fillFormationColors } from '../../src/logic/spawner.js';
import { piercingColors } from '../../src/logic/charge.js';
import {
  M3_STAR_POOL, SHIP_START_Y, SHIP_HALF_HEIGHT, DRONE_BAND_Y, DRONE_MUZZLE_DY, REACTION_FLOOR_SEC,
} from '../../src/config/balance.js';
import { shipMaxY } from '../../src/input/TouchControls.js';
import { speedFor } from '../../src/logic/speed.js';

const seeded = seed => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('droneShot', () => {
  const rng = () => 0.9999; // fastest speed of the tier
  const base = { drone: { x: 100, y: 400 }, ship: { x: 600, y: SHIP_START_Y }, tier: 0, warmup: false, rng };
  const shipYs = [SHIP_START_Y, shipMaxY({ shipHalfHeight: SHIP_HALF_HEIGHT })];
  const droneYs = [DRONE_BAND_Y.min, (DRONE_BAND_Y.min + DRONE_BAND_Y.max) / 2, DRONE_BAND_Y.max];

  it('is null only when the ship is right under the drone', () => {
    for (const diffKey of ['easy', 'normal', 'hard']) {
      expect(droneShot({ ...base, drone: { x: 300, y: 1090 }, ship: { x: 300, y: 1100 }, diffKey, aimAllowed: true })).toBeNull();
    }
  });
  it('never skips and always keeps the reaction floor: ship y 900 and shipMaxY, every tier, difficulty and hover row', () => {
    for (const diffKey of ['easy', 'normal', 'hard']) for (let tier = 0; tier < 4; tier++) {
      for (const shipY of shipYs) for (const y of droneYs) for (const aimAllowed of [false, true]) {
        const s = droneShot({ ...base, drone: { x: 100, y }, ship: { x: 600, y: shipY }, diffKey, tier, aimAllowed });
        expect(s, `${diffKey} t${tier} ship ${shipY} drone ${y}`).not.toBeNull();
        const fromY = y + DRONE_MUZZLE_DY;
        expect(s.vy).toBeGreaterThan(0);
        // time to reach the ship row from the REAL spawn point
        expect((shipY - fromY) / s.vy).toBeGreaterThanOrEqual(REACTION_FLOOR_SEC.hazard[diffKey] - 1e-9);
        expect(Math.hypot(s.vx, s.vy)).toBeLessThanOrEqual(speedFor('hazard', diffKey, tier, rng) + 1e-6);
      }
    }
  });
  it('caps the speed instead of skipping when the ship is close', () => {
    const s = droneShot({ ...base, drone: { x: 300, y: 560 }, ship: { x: 300, y: 560 + DRONE_MUZZLE_DY + 300 }, diffKey: 'hard', tier: 3, aimAllowed: false });
    expect(s).not.toBeNull();
    expect(s.vy).toBeLessThan(speedFor('hazard', 'hard', 3, rng));
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
    const l = droneShot({ ...base, drone: { x: 650, y: 400 }, ship: { x: 100, y: SHIP_START_Y }, diffKey: 'hard', aimAllowed: true });
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
