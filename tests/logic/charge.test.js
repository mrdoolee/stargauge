import { describe, it, expect } from 'vitest';
import {
  chargeLevel, canPierce, piercingColors, pickShieldColor, bossArmorColor, resolveBeamOnEnemy, initialCharge, enemyHitOutcome,
  beamDamage, hitsToDown,
  beamCanTouch, bounceCounts,
} from '../../src/logic/charge.js';
import { DRONE_SHIELDS, HUD_BAND_BOTTOM } from '../../src/config/balance.js';

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
  it('beamDamage: 1 + (beam level - shield level), 0 when colder', () => {
    expect(beamDamage('white', 'white')).toBe(1);
    expect(beamDamage('blueWhite', 'white')).toBe(2);
    expect(beamDamage('blue', 'white')).toBe(3);
    expect(beamDamage('yellow', 'white')).toBe(0);
    expect(beamDamage(null, 'red')).toBe(0);
    expect(beamDamage('red', null)).toBe(1);
    expect(beamDamage(null, null)).toBe(1);
  });
  it('resolveBeamOnEnemy: damage grows with charge temperature above the shield', () => {
    expect(resolveBeamOnEnemy({ charge: 'blue', shieldKey: 'white', hp: 3 })).toEqual({ pierced: true, hp: 0, down: true, damage: 3 });
    expect(resolveBeamOnEnemy({ charge: 'white', shieldKey: 'white', hp: 3 })).toEqual({ pierced: true, hp: 2, down: false, damage: 1 });
    expect(resolveBeamOnEnemy({ charge: 'red', shieldKey: 'white', hp: 3 })).toEqual({ pierced: false, hp: 3, down: false, damage: 0 });
    expect(resolveBeamOnEnemy({ charge: 'blue', shieldKey: 'yellowWhite', hp: 2 })).toEqual({ pierced: true, hp: 0, down: true, damage: 4 });
  });
  it('hitsToDown', () => {
    expect(hitsToDown('white', 'white', 3)).toBe(3);
    expect(hitsToDown('blueWhite', 'white', 3)).toBe(2);
    expect(hitsToDown('yellow', 'white', 3)).toBe(Infinity);
  });
  it('unshielded enemy (shieldKey null) is pierced, even by a plain beam', () => {
    expect(resolveBeamOnEnemy({ charge: 'red', shieldKey: null, hp: 2 })).toEqual({ pierced: true, hp: 1, down: false, damage: 1 });
    expect(resolveBeamOnEnemy({ charge: null, shieldKey: null, hp: 1 })).toEqual({ pierced: true, hp: 0, down: true, damage: 1 });
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

describe('beam judged by its own fire-time charge', () => {
  it('a blue beam pierces white and a red beam bounces, whatever the current charge is', () => {
    const blue = resolveBeamOnEnemy({ charge: 'blue', shieldKey: 'white', hp: 2 });
    const red = resolveBeamOnEnemy({ charge: 'red', shieldKey: 'white', hp: 2 });
    expect(blue.pierced).toBe(true);
    expect(red.pierced).toBe(false);
  });
});

describe('beamCanTouch (HUD band)', () => {
  it('charge mode: only below the HUD band', () => {
    expect(beamCanTouch({ chargeMode: true, y: HUD_BAND_BOTTOM })).toBe(false);
    expect(beamCanTouch({ chargeMode: true, y: 100 })).toBe(false);
    expect(beamCanTouch({ chargeMode: true, y: HUD_BAND_BOTTOM + 1 })).toBe(true);
  });
  it('m1/m2 (no charge mode) keep the old behavior', () => {
    expect(beamCanTouch({ chargeMode: false, y: 100 })).toBe(true);
    expect(beamCanTouch({ chargeMode: undefined, y: -50 })).toBe(true);
  });
});

describe('bounceCounts', () => {
  it('does not count an uncharged beam', () => {
    expect(bounceCounts({ beamKey: null, firedAtMs: 500, shieldChangedAtMs: 0 })).toBe(false);
  });
  it('does not count a beam fired before the shield changed', () => {
    expect(bounceCounts({ beamKey: 'blue', firedAtMs: 900, shieldChangedAtMs: 1000 })).toBe(false);
  });
  it('never counts a bounce off an optional target (m4 escort drone), however the beam was charged', () => {
    expect(bounceCounts({ beamKey: 'red', firedAtMs: 2000, shieldChangedAtMs: 1000, optionalTarget: true })).toBe(false);
    expect(bounceCounts({ beamKey: 'red', firedAtMs: 2000, shieldChangedAtMs: 1000, optionalTarget: false })).toBe(true);
  });
  it('counts a charged beam fired at/after the shield was set', () => {
    expect(bounceCounts({ beamKey: 'red', firedAtMs: 1000, shieldChangedAtMs: 1000 })).toBe(true);
    expect(bounceCounts({ beamKey: 'red', firedAtMs: 2000, shieldChangedAtMs: 1000 })).toBe(true);
  });
});
