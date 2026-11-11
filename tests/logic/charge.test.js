import { describe, it, expect } from 'vitest';
import {
  chargeLevel, canPierce, piercingColors, pickShieldColor, bossArmorColor, resolveBeamOnEnemy, initialCharge, enemyHitOutcome,
} from '../../src/logic/charge.js';
import { DRONE_SHIELDS } from '../../src/config/balance.js';

describe('charge', () => {
  it('chargeLevel by color', () => {
    const exp = { blue: 7, blueWhite: 6, white: 5, yellowWhite: 4, yellow: 3, orange: 2, red: 1 };
    for (const [k, v] of Object.entries(exp)) expect(chargeLevel(k)).toBe(v);
    expect(chargeLevel(null)).toBe(0);
    expect(chargeLevel('bogus')).toBe(0);
  });
  it('canPierce', () => {
    expect(canPierce('white', 'white')).toBe(true);
    expect(canPierce('yellow', 'white')).toBe(false);
    expect(canPierce(null, 'red')).toBe(false);
  });
  it('piercingColors', () => {
    expect(piercingColors('white')).toEqual(['blue', 'blueWhite', 'white']);
  });
  it('pickShieldColor', () => {
    expect(Object.keys(DRONE_SHIELDS.easy)).toContain(pickShieldColor('easy', () => 0));
    for (let i = 0; i < 10000; i++) {
      const c = pickShieldColor('easy');
      expect(c === 'blueWhite' || c === 'blue').toBe(false);
    }
    expect(pickShieldColor('easy', () => 0.999999)).toBe('white');
    expect(pickShieldColor('bogus', () => 0.999999)).toBe('blueWhite');
  });
  it('bossArmorColor', () => {
    expect(bossArmorColor(3, 'normal')).toBe('blueWhite');
    expect(bossArmorColor(1, 'easy')).toBe('yellow');
  });
  it('resolveBeamOnEnemy', () => {
    expect(resolveBeamOnEnemy({ charge: 'blue', shieldKey: 'white', hp: 1 })).toEqual({ pierced: true, hp: 0, down: true });
    expect(resolveBeamOnEnemy({ charge: 'red', shieldKey: 'white', hp: 3 })).toEqual({ pierced: false, hp: 3, down: false });
  });
  it('unshielded enemy (shieldKey null) is pierced, even by a plain beam', () => {
    expect(resolveBeamOnEnemy({ charge: 'red', shieldKey: null, hp: 2 })).toEqual({ pierced: true, hp: 1, down: false });
    expect(resolveBeamOnEnemy({ charge: null, shieldKey: null, hp: 1 })).toEqual({ pierced: true, hp: 0, down: true });
  });
  it('enemyHitOutcome', () => {
    const blocked = { pierced: false, hp: 3, down: false };
    const hit = { pierced: true, hp: 2, down: false };
    const down = { pierced: true, hp: 0, down: true };
    expect(enemyHitOutcome({ res: blocked, keepAlive: false })).toBe('blocked');
    expect(enemyHitOutcome({ res: blocked, keepAlive: true })).toBe('blocked');
    expect(enemyHitOutcome({ res: hit, keepAlive: false })).toBe('pierced');
    expect(enemyHitOutcome({ res: hit, keepAlive: true })).toBe('pierced');
    expect(enemyHitOutcome({ res: down, keepAlive: false })).toBe('down');
    expect(enemyHitOutcome({ res: down, keepAlive: true })).toBe('kept');
  });
  it('initialCharge', () => {
    expect(initialCharge()).toBe(null);
  });
});

import { enemyBeamable } from '../../src/logic/charge.js';
import { HUD_BAND_BOTTOM, BOSS_POS, DRONE_LANES_Y } from '../../src/config/balance.js';

describe('enemyBeamable', () => {
  it('an enemy still behind the HUD band (flying in) cannot be hit, so no invisible bounce costs a star', () => {
    expect(enemyBeamable({ y: -40 })).toBe(false);
    expect(enemyBeamable({ y: HUD_BAND_BOTTOM - 1 })).toBe(false);
    expect(enemyBeamable({ y: HUD_BAND_BOTTOM })).toBe(true);
  });
  it('patrolling drones and the boss are hittable', () => {
    for (const y of DRONE_LANES_Y) expect(enemyBeamable({ y })).toBe(true);
    expect(enemyBeamable({ y: BOSS_POS.y })).toBe(true);
  });
});
