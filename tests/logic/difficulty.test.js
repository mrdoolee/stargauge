import { shipMaxY } from '../../src/input/TouchControls.js';
import { SHIP_HALF_HEIGHT, BEAM_SPAWN_OFFSET_Y } from '../../src/config/balance.js';
import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY, DIFFICULTY_KEYS, getDifficulty, scaleSpeed, scaleInterval, scaledHeat,
  requiredDodgeFraction, M1_HARD_GRACE_CHECK,
} from '../../src/logic/difficulty.js';
import { STAR_HEAT, FURNACE_HEAT, ASTEROID_HEAT } from '../../src/config/balance.js';

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

describe('m1 white grace at hard speed', () => {
  it('a beam fired while the blob is still white connects within the grace window', () => {
    expect(M1_HARD_GRACE_CHECK().ok).toBe(true);
  });
  it('derives the beam start from the controls layout (not a hardcoded number)', () => {
    expect(M1_HARD_GRACE_CHECK().contactMs).toBeGreaterThan(0);
    expect(shipMaxY({ shipHalfHeight: SHIP_HALF_HEIGHT }) - BEAM_SPAWN_OFFSET_Y).toBe(916);
  });
});
