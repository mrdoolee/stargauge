import { describe, it, expect } from 'vitest';
import { speedBand, speedFor, topEntryReactionSec, safeDistancePx, canLaunch, aimVelocity } from '../../src/logic/speed.js';
import { SPEED_BANDS_H, REACTION_FLOOR_SEC } from '../../src/config/balance.js';

const H = 1280;
const cats = ['target', 'hazard'];
const diffs = ['easy', 'normal', 'hard'];

describe('speed', () => {
  it('bands match the spec', () => {
    for (const c of cats) for (const d of diffs) {
      expect(speedBand(c, d, 0).min).toBeCloseTo(SPEED_BANDS_H[c][d][0] * H, 6);
      expect(speedBand(c, d, 3).max).toBeCloseTo(SPEED_BANDS_H[c][d][1] * H, 6);
    }
    for (const c of cats) for (const d of ['normal', 'hard']) {
      for (let t = 1; t < 4; t++) expect(speedBand(c, d, t).min).toBeGreaterThan(speedBand(c, d, t - 1).min);
    }
    expect(speedBand('target', 'easy', 2)).toEqual(speedBand('target', 'easy', 0));
  });

  it('top-entry reaction floors hold at the fastest speed', () => {
    for (const c of cats) for (const d of diffs) {
      expect(topEntryReactionSec(speedBand(c, d, 3).max)).toBeGreaterThanOrEqual(REACTION_FLOOR_SEC[c][d]);
    }
  });

  it('canLaunch refuses launches closer than the floor', () => {
    const base = { speedPxS: 500, category: 'hazard', diffKey: 'normal' };
    expect(safeDistancePx('hazard', 'normal', 500)).toBeCloseTo(350, 6);
    expect(canLaunch({ ...base, shipY: 900, fromY: 551 })).toBe(false);
    expect(canLaunch({ ...base, shipY: 900, fromY: 549 })).toBe(true);
  });

  it('aimVelocity never points up and keeps the speed', () => {
    const v = aimVelocity({ x: 360, y: 700 }, { x: 100, y: 200 }, 400);
    expect(v.vy).toBeGreaterThan(0);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(400, 6);
    const side = aimVelocity({ x: 360, y: 500 }, { x: 700, y: 500 }, 400);
    expect(Math.atan2(side.vx, side.vy) * 180 / Math.PI).toBeCloseTo(35, 6);
    expect(aimVelocity({ x: 360, y: 0 }, { x: 360, y: 900 }, 300).vx).toBeCloseTo(0, 9);
  });

  it('speedFor stays inside the band', () => {
    for (const c of cats) for (const d of diffs) for (let t = 0; t < 4; t++) {
      const b = speedBand(c, d, t);
      for (const r of [0, 0.999999]) {
        const s = speedFor(c, d, t, () => r);
        expect(s).toBeGreaterThanOrEqual(b.min);
        expect(s).toBeLessThanOrEqual(b.max);
      }
    }
  });
});

import { createFormationMemo } from '../../src/logic/speed.js';
describe('createFormationMemo', () => {
  it('draws once per formation index', () => {
    const memo = createFormationMemo();
    let n = 0;
    const draw = () => ++n;
    expect(memo(0, draw)).toBe(1);
    expect(memo(0, draw)).toBe(1);
    expect(memo(1, draw)).toBe(2);
    expect(memo(1, draw)).toBe(2);
    expect(memo(2, draw)).toBe(3);
  });
});
