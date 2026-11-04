import { describe, it, expect } from 'vitest';
import {
  chargeLevel, canPierce, piercingColors, pickShieldColor, bossArmorColor, resolveBeamOnEnemy, initialCharge,
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
  it('initialCharge', () => {
    expect(initialCharge()).toBe(null);
  });
});
