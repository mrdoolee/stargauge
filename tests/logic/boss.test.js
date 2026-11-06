import { describe, it, expect } from 'vitest';
import { bossCycle, fanVelocities, bossWarmup, swayOffset, formatTime } from '../../src/logic/boss.js';
import { canLaunch } from '../../src/logic/speed.js';
import {
  BOSS_ATTACK_MS, BOSS_GAP_MS, SHIP_START_Y, WARMUP_MS, WARMUP_DENSITY,
} from '../../src/config/balance.js';

describe('bossCycle', () => {
  it('alternates attack and gap, gapJustStarted fires once per cycle', () => {
    for (const stage of [1, 2, 3]) {
      const atk = BOSS_ATTACK_MS[stage];
      const period = atk + BOSS_GAP_MS;
      let starts = 0;
      let prev = 0;
      for (let t = 16; t < period * 3; t += 16) {
        const c = bossCycle(stage, t, prev);
        expect(c.attacking).toBe(t % period < atk);
        if (c.gapJustStarted) starts += 1;
        prev = t;
      }
      expect(starts).toBe(3);
      expect(bossCycle(stage, 0).attacking).toBe(true);
      expect(bossCycle(stage, 0).gapJustStarted).toBe(false);
    }
  });
});

describe('fanVelocities', () => {
  it('never shoots upward and keeps the count', () => {
    for (const count of [1, 2, 3]) for (const base of [-35, 0, 35]) for (const spread of [30, 36]) {
      const v = fanVelocities(base, count, spread, 500);
      expect(v).toHaveLength(count);
      for (const s of v) {
        expect(s.vy).toBeGreaterThan(0);
        expect(Math.hypot(s.vx, s.vy)).toBeCloseTo(500, 6);
      }
    }
    const v = fanVelocities(0, 3, 30, 500);
    expect(v[0].vx).toBeLessThan(0);
    expect(v[1].vx).toBeCloseTo(0, 6);
    expect(v[2].vx).toBeGreaterThan(0);
  });
});

describe('bossWarmup', () => {
  it('no aim and sparser volleys during warm-up, normal afterwards', () => {
    const w = bossWarmup(1000, true, 1600);
    expect(w.warm).toBe(true);
    expect(w.aim).toBe(false);
    expect(w.intervalMs).toBeCloseTo(1600 / WARMUP_DENSITY);
    expect(w.intervalMs).toBeGreaterThan(1600);
    const a = bossWarmup(WARMUP_MS, true, 1600);
    expect(a).toEqual({ warm: false, aim: true, intervalMs: 1600 });
    expect(bossWarmup(WARMUP_MS + 1, false, 1600).aim).toBe(false);
  });
});

import { bossStageFromHp, bossShotSpeed, stageChangeVolleyMs } from '../../src/logic/boss.js';
import { bossArmorColor, chargeLevel } from '../../src/logic/charge.js';
import { speedFor } from '../../src/logic/speed.js';
import { BOSS_HP, BOSS_VOLLEY_MS, BOSS_POS, BOSS_MUZZLE_DY, BOSS_SWAY, HUD_BAND_BOTTOM, BOSS_WIDTH_PX, BOSS_ART } from '../../src/config/balance.js';
import { scaleInterval } from '../../src/logic/difficulty.js';

describe('bossStageFromHp', () => {
  it('stays on the stage while hp is left', () => {
    expect(bossStageFromHp({ stage: 1, hp: 3 })).toEqual({ stage: 1, hp: 3, cleared: false });
  });
  it('hp 0 advances to the next stage with its full hp', () => {
    expect(bossStageFromHp({ stage: 1, hp: 0 })).toEqual({ stage: 2, hp: BOSS_HP[1], cleared: false });
    expect(bossStageFromHp({ stage: 2, hp: 0 })).toEqual({ stage: 3, hp: BOSS_HP[2], cleared: false });
  });
  it('stage 3 at hp 0 is cleared', () => {
    expect(bossStageFromHp({ stage: 3, hp: 0 })).toEqual({ stage: 3, hp: 0, cleared: true });
  });
});

describe('boss armor', () => {
  it('never gets cooler from stage to stage, on every difficulty', () => {
    for (const d of ['easy', 'normal', 'hard']) {
      const lv = [1, 2, 3].map(s => chargeLevel(bossArmorColor(s, d)));
      expect(lv[1]).toBeGreaterThanOrEqual(lv[0]);
      expect(lv[2]).toBeGreaterThanOrEqual(lv[1]);
    }
  });
});

describe('boss position', () => {
  it('is visible below the HUD band and swings inside the screen', () => {
    expect(BOSS_POS.y).toBeGreaterThan(HUD_BAND_BOTTOM);
    expect(BOSS_POS.x - BOSS_SWAY.amp - BOSS_WIDTH_PX / 2).toBeGreaterThanOrEqual(0);
    expect(BOSS_POS.x + BOSS_SWAY.amp + BOSS_WIDTH_PX / 2).toBeLessThanOrEqual(720);
  });
  it('bossShotSpeed from the muzzle is canLaunch-safe at ship y 900 for every difficulty and tier (max speed)', () => {
    const fromY = BOSS_POS.y + BOSS_MUZZLE_DY;
    for (const diffKey of ['easy', 'normal', 'hard']) for (let tier = 0; tier < 4; tier++) {
      const v = bossShotSpeed({ fromY, shipY: SHIP_START_Y, diffKey, tier, rng: () => 0.9999 });
      expect(v).not.toBeNull();
      expect(canLaunch({ fromY, shipY: SHIP_START_Y, speedPxS: v, category: 'hazard', diffKey })).toBe(true);
      expect(v).toBeLessThanOrEqual(speedFor('hazard', diffKey, tier, () => 0.9999) + 1e-6);
    }
  });
  it('bossShotSpeed is capped (not skipped) when the ship is close, and null when it is right under the muzzle', () => {
    const fromY = BOSS_POS.y + BOSS_MUZZLE_DY;
    const v = bossShotSpeed({ fromY, shipY: fromY + 200, diffKey: 'hard', tier: 3, rng: () => 0.9999 });
    expect(v).toBeGreaterThan(0);
    expect(canLaunch({ fromY, shipY: fromY + 200, speedPxS: v, category: 'hazard', diffKey: 'hard' })).toBe(true);
    expect(bossShotSpeed({ fromY, shipY: fromY + 20, diffKey: 'hard', tier: 3 })).toBeNull();
  });
});

describe('boss hull box', () => {
  it('muzzle sits at the hull bottom and the hull stays inside the canvas', () => {
    const k = BOSS_WIDTH_PX / BOSS_ART.canvasW;
    const h = BOSS_ART.hull;
    expect(h.x + h.w).toBeLessThanOrEqual(BOSS_ART.canvasW);
    expect(h.y + h.h).toBeLessThanOrEqual(BOSS_ART.canvasH);
    expect(Math.abs((h.y + h.h - BOSS_ART.canvasH / 2) * k - BOSS_MUZZLE_DY)).toBeLessThan(1);
  });
});

describe('swayOffset', () => {
  it('is a sine of period periodMs', () => {
    expect(swayOffset(0, 20, 4000)).toBeCloseTo(0);
    expect(swayOffset(1000, 20, 4000)).toBeCloseTo(20);
    expect(swayOffset(3000, 20, 4000)).toBeCloseTo(-20);
  });
  it('phase shifts it', () => {
    expect(swayOffset(0, 20, 4000, Math.PI / 2)).toBeCloseTo(20);
  });
});

describe('formatTime', () => {
  it('m:ss, rounds up, never negative', () => {
    expect(formatTime(150)).toBe('2:30');
    expect(formatTime(61.2)).toBe('1:02');
    expect(formatTime(-3)).toBe('0:00');
  });
});

describe('stageChangeVolleyMs', () => {
  it('waits one full scaled volley interval of the new stage (never 0)', () => {
    for (const diffKey of ['easy', 'normal', 'hard']) for (const stage of [2, 3]) {
      const ms = stageChangeVolleyMs(stage, diffKey);
      expect(ms).toBe(scaleInterval(BOSS_VOLLEY_MS[stage], diffKey));
      expect(ms).toBeGreaterThanOrEqual(1500);
    }
  });
});
