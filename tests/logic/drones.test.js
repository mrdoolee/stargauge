import { describe, it, expect } from 'vitest';
import { droneFormation, droneShot, neededChargeColors } from '../../src/logic/drones.js';
import { fillFormationColors } from '../../src/logic/spawner.js';
import { piercingColors, guaranteeColors } from '../../src/logic/charge.js';
import {
  M3_STAR_POOL, M4_STAR_POOL, M3_DECOY_SCALE, BOSS_ARMOR, SPAWN_NEEDED_GUARANTEE, SHIP_START_Y, SHIP_HALF_HEIGHT, DRONE_LANES_Y, DRONE_MUZZLE_DY, REACTION_FLOOR_SEC,
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
  const droneYs = DRONE_LANES_Y;

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

describe('m4 charge stars: decoys and the needed-color guarantee', () => {
  it('M4_STAR_POOL holds all seven colors and red/orange decoys are the largest share; hot stars are rarer than red+orange', () => {
    const count = c => M4_STAR_POOL.filter(x => x === c).length;
    for (const c of ['blue', 'blueWhite', 'white', 'yellowWhite', 'yellow', 'orange', 'red']) expect(count(c)).toBeGreaterThan(0);
    const decoys = count('red') + count('orange');
    expect(decoys / M4_STAR_POOL.length).toBeGreaterThanOrEqual(0.5);
    expect(count('blue')).toBeLessThan(count('red'));
    expect(count('blue') / M4_STAR_POOL.length).toBeLessThanOrEqual(0.05); // 2026-11-12: blue halved (was 1 of 11)
    for (const c of ['yellow', 'yellowWhite', 'white', 'blueWhite']) expect(count(c)).toBe(2 * count('blue'));
    expect(M3_DECOY_SCALE.min).toBeGreaterThan(1); // decoys are drawn big (reused from m3)
  });
  it('the piercing color of every armor (every difficulty and stage, incl. hard blue) never misses more than SPAWN_NEEDED_GUARANTEE formations', () => {
    for (const diff of Object.keys(BOSS_ARMOR)) for (const armor of BOSS_ARMOR[diff]) {
      const rng = seeded(7);
      const needed = piercingColors(armor);
      const guaranteed = guaranteeColors(armor); // what M4BossScene passes to the guarantee (blue only when nothing else pierces)
      let since = 0;
      let streak = 0;
      let worst = 0;
      for (let i = 0; i < 300; i++) {
        const size = 3 + Math.floor(rng() * 3);
        const r = fillFormationColors({ slotCount: size, needed: guaranteed, all: M4_STAR_POOL, sinceNeeded: since, rng });
        since = r.sinceNeeded;
        streak = r.colors.some(c => needed.includes(c)) ? 0 : streak + 1;
        worst = Math.max(worst, streak);
      }
      expect(worst).toBeLessThanOrEqual(SPAWN_NEEDED_GUARANTEE);
    }
  });
});

import { pickDroneLane } from '../../src/logic/drones.js';
import { hpBarOffsetY, hpBarY } from '../../src/logic/enemyHp.js';
import {
  DRONE_MAX_ON_SCREEN, SHIELD_UNIT, HP_BAR_H, HUD_BAND_BOTTOM, BOSS_ESCORT_LANES_Y, BOSS_ESCORTS, BOSS_POS, BOSS_MUZZLE_DY,
} from '../../src/config/balance.js';
import { SHIELD_RING_R, SHIELD_RING_W, SHIELD_TEX, ENEMY_TEX, bossShieldGeometry } from '../../src/objects/starTextures.js';

/** Screen rows a drone at y covers: its shield ring (outer edge + soft edge) and its hp bar (flipped below near the HUD band). */
function droneExtentY(y) {
  const ringOuter = (SHIELD_RING_R + SHIELD_RING_W / 2 + 1) * SHIELD_UNIT; // a drone's shieldScale is SHIELD_UNIT (80 px footprint)
  const offY = hpBarOffsetY(ENEMY_TEX / 2, (SHIELD_TEX * SHIELD_UNIT) / 2); // as BaseMissionScene.showHpBar
  const barY = hpBarY(y, offY, HP_BAR_H, HUD_BAND_BOTTOM);
  return [Math.min(y - ringOuter, barY - HP_BAR_H / 2), Math.max(y + ringOuter, barY + HP_BAR_H / 2)];
}
const lanesApart = lanes => {
  for (let i = 1; i < lanes.length; i++) expect(droneExtentY(lanes[i])[0], `lane ${lanes[i]}`).toBeGreaterThan(droneExtentY(lanes[i - 1])[1]);
};

describe('drone patrol lanes (final-review m1)', () => {
  it('m3: one lane per drone on screen; neighbouring drones never overlap ring or hp bar', () => {
    expect(DRONE_LANES_Y.length).toBeGreaterThanOrEqual(DRONE_MAX_ON_SCREEN);
    lanesApart(DRONE_LANES_Y);
    expect(droneExtentY(DRONE_LANES_Y[0])[0]).toBeGreaterThanOrEqual(HUD_BAND_BOTTOM - 4); // the top drone's bar stays out of the HUD band
  });
  it('m4 escorts: one lane per escort the boss can want; lanes apart and the top one clear of the boss hull and shield ellipse', () => {
    const most = Math.max(...Object.values(BOSS_ESCORTS).flatMap(t => Object.values(t)));
    expect(BOSS_ESCORT_LANES_Y.length).toBeGreaterThanOrEqual(most);
    lanesApart(BOSS_ESCORT_LANES_Y);
    const g = bossShieldGeometry();
    const ringBottom = BOSS_POS.y + g.ry + g.lineW / 2 + 1;
    expect(ringBottom).toBeGreaterThan(BOSS_POS.y + BOSS_MUZZLE_DY); // the ring is below the hull bottom
    expect(droneExtentY(BOSS_ESCORT_LANES_Y[0])[0]).toBeGreaterThan(ringBottom);
  });
  it('pickDroneLane never returns a taken lane and reaches every free one', () => {
    const rng = seeded(3);
    const seen = new Set();
    for (let i = 0; i < 300; i++) {
      const lane = pickDroneLane([1], 3, rng);
      expect([0, 2]).toContain(lane);
      seen.add(lane);
    }
    expect([...seen].sort()).toEqual([0, 2]);
    expect(pickDroneLane([0, 2], 3, rng)).toBe(1);
    expect(pickDroneLane([], 3, () => 0)).toBe(0);
    expect(pickDroneLane([], 3, () => 0.9999)).toBe(2);
    expect(pickDroneLane([undefined, null], 2, () => 0)).toBe(0); // enemies without a lane do not block one
  });
  it('pickDroneLane returns null when every lane is taken', () => {
    expect(pickDroneLane([0, 1, 2], 3, Math.random)).toBeNull();
    expect(pickDroneLane([2, 0, 1, 1], 3, Math.random)).toBeNull();
  });
  it('a wave filling every free lane gives each drone its own lane', () => {
    const rng = seeded(11);
    for (let i = 0; i < 200; i++) {
      const taken = [];
      for (let k = 0; k < DRONE_MAX_ON_SCREEN; k++) {
        const lane = pickDroneLane(taken, DRONE_LANES_Y.length, rng);
        expect(lane).not.toBeNull();
        taken.push(lane);
      }
      expect(new Set(taken).size).toBe(DRONE_MAX_ON_SCREEN);
    }
  });
});
