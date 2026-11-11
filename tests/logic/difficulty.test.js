import { shipMaxY } from '../../src/input/TouchControls.js';
import { SHIP_HALF_HEIGHT, BEAM_SPAWN_OFFSET_Y } from '../../src/config/balance.js';
import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY, DIFFICULTY_KEYS, getDifficulty, scaleSpeed, scaleInterval, scaledHeat,
  requiredDodgeFraction, heatInflowPerSec, formationSlotsPerSec, M1_HARD_GRACE_CHECK,
} from '../../src/logic/difficulty.js';
import {
  STAR_HEAT, FURNACE_HEAT, ASTEROID_HEAT, BOSS_ATTACK_MS, BOSS_GAP_MS, BOSS_VOLLEY_MS, BOSS_FAN_SHIP_HITS,
  FORMATION_GAP_MS, M3_STAR_POOL, M4_STAR_POOL, DRONE_MAX_ON_SCREEN, DRONE_FIRE_MS, MISSED_STAR_SHARE, DRONE_ALIVE_DUTY,
  BOSS_ESCORTS, BOSS_ESCORT_FIRE_MS, BOSS_AIMED_FROM_STAGE,
} from '../../src/config/balance.js';

describe('DIFFICULTY table', () => {
  it('has easy/normal/hard with Korean labels', () => {
    expect(DIFFICULTY_KEYS).toEqual(['easy', 'normal', 'hard']);
    expect(DIFFICULTY.easy.label).toBe('쉬움');
    expect(DIFFICULTY.normal.label).toBe('중간');
    expect(DIFFICULTY.hard.label).toBe('어려움');
  });
  it('normal multipliers are all 1', () => {
    expect(DIFFICULTY.normal).toMatchObject({ speed: 1, spawnInterval: 1, heat: 1 });
  });
  it('easy < normal < hard in speed and heat; spawn interval shrinks', () => {
    const [e, n, h] = DIFFICULTY_KEYS.map(k => DIFFICULTY[k]);
    expect(e.speed).toBeLessThan(n.speed); expect(n.speed).toBeLessThan(h.speed);
    expect(e.heat).toBeLessThan(n.heat); expect(n.heat).toBeLessThan(h.heat);
    expect(e.spawnInterval).toBeGreaterThan(n.spawnInterval); expect(n.spawnInterval).toBeGreaterThan(h.spawnInterval);
  });
  it('unknown key falls back to normal', () => {
    for (const k of [undefined, null, '', 'extreme', 'toString', 5]) expect(getDifficulty(k)).toBe(DIFFICULTY.normal);
    expect(getDifficulty('hard')).toBe(DIFFICULTY.hard);
  });
});

describe('helpers', () => {
  it('scale speed and interval', () => {
    expect(scaleSpeed(200, 'hard')).toBeCloseTo(200 * DIFFICULTY.hard.speed);
    expect(scaleSpeed(200, 'bogus')).toBe(200);
    expect(scaleInterval(1000, 'easy')).toBeCloseTo(1000 * DIFFICULTY.easy.spawnInterval);
    expect(scaleInterval(1000)).toBe(1000);
  });
  it('scaledHeat keeps the strict color order for every difficulty', () => {
    for (const d of DIFFICULTY_KEYS) {
      const star = Object.keys(STAR_HEAT).map(c => scaledHeat('star', c, d));
      for (let i = 1; i < star.length; i++) expect(star[i]).toBeLessThan(star[i - 1]);
      const fur = Object.keys(FURNACE_HEAT).map(c => scaledHeat('furnace', c, d));
      for (let i = 1; i < fur.length; i++) expect(fur[i]).toBeLessThan(fur[i - 1]);
    }
  });
  it('scaledHeat scales hits, normal unchanged, asteroid too', () => {
    expect(scaledHeat('star', 'blue', 'normal')).toBe(STAR_HEAT.blue);
    expect(scaledHeat('asteroid', null, 'hard')).toBeCloseTo(ASTEROID_HEAT * DIFFICULTY.hard.heat);
    expect(scaledHeat('star', 'blue', 'easy')).toBeLessThan(STAR_HEAT.blue);
  });
});

describe('worst-case heat inflow', () => {
  it('required dodge fraction rises with difficulty on every mission', () => {
    for (const m of ['m1', 'm2', 'm3', 'm4']) {
      const [e, n, h] = DIFFICULTY_KEYS.map(k => requiredDodgeFraction(m, k));
      expect(e).toBeLessThanOrEqual(n); expect(n).toBeLessThanOrEqual(h);
    }
  });
  it('hard stays finishable: never needs a perfect dodge rate', () => {
    for (const m of ['m1', 'm2', 'm3', 'm4']) expect(requiredDodgeFraction(m, 'hard')).toBeLessThan(0.9);
  });
  it('easy never needs more than 40% dodging', () => {
    for (const m of ['m1', 'm2', 'm3', 'm4']) expect(requiredDodgeFraction(m, 'easy')).toBeLessThanOrEqual(0.4);
  });
});

describe('m3 drone model', () => {
  it('= missed charge stars (pool-weighted mean star heat x MISSED_STAR_SHARE) + drone bullets x alive duty at asteroid heat', () => {
    for (const k of DIFFICULTY_KEYS) {
      const poolStar = M3_STAR_POOL.reduce((a, c) => a + scaledHeat('star', c, k), 0) / M3_STAR_POOL.length;
      const stars = formationSlotsPerSec(FORMATION_GAP_MS.m3, k) * poolStar * MISSED_STAR_SHARE;
      const bullets = DRONE_MAX_ON_SCREEN * DRONE_ALIVE_DUTY * (1000 / DRONE_FIRE_MS[k]) * scaledHeat('asteroid', null, k);
      expect(heatInflowPerSec('m3', k)).toBeCloseTo(stars + bullets, 6);
    }
  });
  it('firing faster raises the required dodge (drones fire faster on harder difficulties)', () => {
    expect(DRONE_FIRE_MS.easy).toBeGreaterThan(DRONE_FIRE_MS.normal);
    expect(DRONE_FIRE_MS.normal).toBeGreaterThan(DRONE_FIRE_MS.hard);
  });
});

describe('m3/m4 shooter density stays up (not fitted by thinning the game)', () => {
  it('knobs stay in the agreed shooter ranges', async () => {
    const b = await import('../../src/config/balance.js');
    expect(b.DRONE_FIRE_MS.easy).toBeLessThanOrEqual(4500);
    expect(b.DRONE_MAX_ON_SCREEN).toBeGreaterThanOrEqual(3);
    expect(b.FORMATION_GAP_MS.m3).toBeLessThanOrEqual(2800);
    expect(b.FORMATION_GAP_MS.m4).toBeLessThanOrEqual(3000);
    for (const k of ['easy', 'normal', 'hard']) expect(b.BOSS_GAP_MS[k]).toBeLessThanOrEqual(4500);
    expect(b.BOSS_GAP_MS.normal).toBeLessThan(4500); // the boss rests less (brief 2026-11-07)
    expect(b.BOSS_GAP_MS.hard).toBeLessThan(b.BOSS_GAP_MS.normal);
    expect(b.MISSED_STAR_SHARE).toBe(0.25);
    expect(b.DRONE_ALIVE_DUTY).toBe(0.6);
  });
  it('hard is clearly denser than normal on m3 and m4', () => {
    for (const m of ['m3', 'm4']) expect(heatInflowPerSec(m, 'hard')).toBeGreaterThan(heatInflowPerSec(m, 'normal') * 1.25);
  });
});

describe('m4 boss stages', () => {
  it('every stage respects the easy / hard bounds and the difficulty order', () => {
    for (const st of [1, 2, 3]) {
      const [e, n, h] = DIFFICULTY_KEYS.map(k => requiredDodgeFraction('m4', k, st));
      expect(e).toBeLessThanOrEqual(0.4); expect(h).toBeLessThan(0.9);
      expect(e).toBeLessThanOrEqual(n); expect(n).toBeLessThanOrEqual(h);
    }
  });
  it('= missed charge stars (M4_STAR_POOL mean x MISSED_STAR_SHARE) + boss volleys (ceil per window, fan = BOSS_FAN_SHIP_HITS shots, aimed shot from stage 2, not on easy; every boss bullet at the asteroid heat the engine applies) + escort bullets (alive duty, BOSS_ESCORT_FIRE_MS)', () => {
    expect(BOSS_FAN_SHIP_HITS).toBe(1.5);
    expect(BOSS_AIMED_FROM_STAGE).toBe(2);
    for (const k of DIFFICULTY_KEYS) for (const st of [1, 2, 3]) {
      const volleys = Math.ceil(BOSS_ATTACK_MS[st] / (BOSS_VOLLEY_MS[k][st] * DIFFICULTY[k].spawnInterval));
      const heat = scaledHeat('asteroid', null, k); // BaseMissionScene.handleBulletHit
      const aimed = k !== 'easy' && st >= BOSS_AIMED_FROM_STAGE ? 1 : 0;
      const boss = (volleys * ((st === 1 ? 1 : BOSS_FAN_SHIP_HITS) + aimed) * heat) / ((BOSS_ATTACK_MS[st] + BOSS_GAP_MS[k]) / 1000);
      const poolStar = M4_STAR_POOL.reduce((a, c) => a + scaledHeat('star', c, k), 0) / M4_STAR_POOL.length;
      const stars = formationSlotsPerSec(FORMATION_GAP_MS.m4, k) * poolStar * MISSED_STAR_SHARE;
      const escorts = BOSS_ESCORTS[k][st] * DRONE_ALIVE_DUTY * (1000 / BOSS_ESCORT_FIRE_MS[k]) * scaledHeat('asteroid', null, k);
      expect(heatInflowPerSec('m4', k, st)).toBeCloseTo(boss + stars + escorts, 6);
    }
  });
  it('no stage sits near a volley-count cliff: attack / scaled interval stays >= 15% away from an integer', () => {
    for (const k of DIFFICULTY_KEYS) for (const st of [1, 2, 3]) {
      const r = BOSS_ATTACK_MS[st] / scaleInterval(BOSS_VOLLEY_MS[k][st], k);
      const frac = r - Math.floor(r);
      expect(frac, `${k} stage ${st}: ${r.toFixed(3)}`).toBeGreaterThanOrEqual(0.15);
      expect(frac, `${k} stage ${st}: ${r.toFixed(3)}`).toBeLessThanOrEqual(0.85);
    }
  });
  it('no single-volley windows: at least 2 volleys per attack window on every difficulty and stage', () => {
    for (const k of DIFFICULTY_KEYS) for (const st of [1, 2, 3]) {
      expect(Math.ceil(BOSS_ATTACK_MS[st] / scaleInterval(BOSS_VOLLEY_MS[k][st], k))).toBeGreaterThanOrEqual(2);
    }
  });
  it('escorts add heat only in the stages that have them', () => {
    for (const k of ['normal', 'hard']) {
      expect(BOSS_ESCORTS[k][1]).toBe(0);
      expect(BOSS_ESCORTS[k][2]).toBeGreaterThan(0);
    }
  });
  it('the boss is the hardest stage: m4 needs more dodging than m3 on normal and hard (teacher 2026-11-07)', () => {
    for (const k of ['normal', 'hard']) {
      expect(requiredDodgeFraction('m4', k)).toBeGreaterThan(requiredDodgeFraction('m3', k));
    }
  });
  it('m4 dodge is at least m3 dodge on EVERY difficulty, and easy m4 stays within 0.4 (controller ruling 2026-11-07)', () => {
    for (const k of DIFFICULTY_KEYS) expect(requiredDodgeFraction('m4', k)).toBeGreaterThanOrEqual(requiredDodgeFraction('m3', k));
    expect(requiredDodgeFraction('m4', 'easy')).toBeLessThanOrEqual(0.4);
  });
  it('no-stage m4 is the worst stage', () => {
    for (const k of DIFFICULTY_KEYS) {
      expect(requiredDodgeFraction('m4', k)).toBeGreaterThanOrEqual(requiredDodgeFraction('m4', k, 3));
    }
  });
});

describe('m1 white grace at hard speed', () => {
  it('a beam fired while the blob is still white connects within the grace window', () => {
    expect(M1_HARD_GRACE_CHECK().ok).toBe(true);
  });
  it('derives the beam start from the controls layout (not a hardcoded number)', () => {
    expect(M1_HARD_GRACE_CHECK().contactMs).toBeGreaterThan(0);
    expect(shipMaxY({ shipHalfHeight: SHIP_HALF_HEIGHT }) - BEAM_SPAWN_OFFSET_Y).toBe(916);
  });
});
