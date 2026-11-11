import { describe, it, expect } from 'vitest';
import {
  bossCycle, fanVelocities, bossWarmup, swayOffset, formatTime, bossStageFromHp, bossFightSec, bossHp, bossGapMs, bossFan, escortTarget, bossVolleyShots,
} from '../../src/logic/boss.js';
import { hitsToDown, bossArmorColor, chargeLevel } from '../../src/logic/charge.js';
import { droneShot } from '../../src/logic/drones.js';
import { STAR_COLORS } from '../../src/logic/temperature.js';
import { canLaunch } from '../../src/logic/speed.js';
import {
  BOSS_ATTACK_MS, BOSS_GAP_MS, BOSS_HP, BOSS_DAMAGE_UNIT, BOSS_FAN, BOSS_ESCORTS, BOSS_ESCORT_LANES_Y, BOSS_ESCORT_FIRE_MS, BOSS_ARMOR, BOSS_ESCORT_MIN_SHOT_SPEED, M4_TIME_LIMIT_SEC, BOSS_STAGE_FIND_SEC, M3_SEC_PER_SHOT, SHIP_START_Y, WARMUP_MS, WARMUP_DENSITY,
} from '../../src/config/balance.js';

describe('bossCycle', () => {
  it('alternates attack and gap (gap per difficulty), gapJustStarted fires once per cycle', () => {
    for (const diffKey of ['easy', 'normal', 'hard']) for (const stage of [1, 2, 3]) {
      const atk = BOSS_ATTACK_MS[stage];
      const period = atk + BOSS_GAP_MS[diffKey];
      let starts = 0;
      let prev = 0;
      for (let t = 16; t < period * 3; t += 16) {
        const c = bossCycle(stage, t, prev, diffKey);
        expect(c.attacking).toBe(t % period < atk);
        if (c.gapJustStarted) starts += 1;
        prev = t;
      }
      expect(starts).toBe(3);
      expect(bossCycle(stage, 0, null, diffKey).attacking).toBe(true);
      expect(bossCycle(stage, 0, null, diffKey).gapJustStarted).toBe(false);
    }
  });
  it('bossGapMs is the table value, normal for an unknown key; the rest gets shorter with difficulty and is never longer than before (4500)', () => {
    expect(bossGapMs('hard')).toBe(BOSS_GAP_MS.hard);
    expect(bossGapMs('zzz')).toBe(BOSS_GAP_MS.normal);
    expect(BOSS_GAP_MS.easy).toBeGreaterThan(BOSS_GAP_MS.normal);
    expect(BOSS_GAP_MS.normal).toBeGreaterThan(BOSS_GAP_MS.hard);
    expect(BOSS_GAP_MS.easy).toBeLessThan(4500);
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

import { bossShotSpeed, stageChangeVolleyMs, bossVolleyMs } from '../../src/logic/boss.js';
import { bossArmorColor, chargeLevel } from '../../src/logic/charge.js';
import { speedFor } from '../../src/logic/speed.js';
import { BOSS_VOLLEY_MS, BOSS_POS, BOSS_MUZZLE_DY, BOSS_SWAY, HUD_BAND_BOTTOM, BOSS_WIDTH_PX, BOSS_ART } from '../../src/config/balance.js';
import { scaleInterval } from '../../src/logic/difficulty.js';

describe('bossStageFromHp', () => {
  it('stays on the stage while hp is left', () => {
    expect(bossStageFromHp({ stage: 1, hp: 3, diffKey: 'normal' })).toEqual({ stage: 1, hp: 3, cleared: false });
  });
  it('hp 0 advances to the next stage with its full hp of that difficulty', () => {
    for (const diffKey of ['easy', 'normal', 'hard']) {
      expect(bossStageFromHp({ stage: 1, hp: 0, diffKey })).toEqual({ stage: 2, hp: BOSS_HP[diffKey][1], cleared: false });
      expect(bossStageFromHp({ stage: 2, hp: 0, diffKey })).toEqual({ stage: 3, hp: BOSS_HP[diffKey][2], cleared: false });
    }
  });
  it('stage 3 at hp 0 is cleared', () => {
    expect(bossStageFromHp({ stage: 3, hp: 0, diffKey: 'hard' })).toEqual({ stage: 3, hp: 0, cleared: true });
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

describe('stageChangeVolleyMs / bossVolleyMs', () => {
  it('waits one full scaled volley interval of the new stage (never 0)', () => {
    for (const diffKey of ['easy', 'normal', 'hard']) for (const stage of [2, 3]) {
      const ms = stageChangeVolleyMs(stage, diffKey);
      expect(ms).toBe(scaleInterval(BOSS_VOLLEY_MS[diffKey][stage], diffKey));
      expect(ms).toBe(bossVolleyMs(stage, diffKey));
      expect(ms).toBeGreaterThanOrEqual(1500);
    }
  });
  it('the boss fires more often on harder difficulties: scaled interval hard < normal < easy in every stage (2026-11-07)', () => {
    // The 2026-11-07 pin of the old easy table (2200/3400/3800) and its base-value order were dropped with the asteroid-heat
    // model fix (2026-11-11): at the heat the engine applies, the old easy table left easy m4 below easy m3 (difficulty.test.js).
    for (const st of [1, 2, 3]) {
      expect(bossVolleyMs(st, 'hard')).toBeLessThan(bossVolleyMs(st, 'normal'));
      expect(bossVolleyMs(st, 'normal')).toBeLessThan(bossVolleyMs(st, 'easy'));
    }
  });
});

describe('boss fan (per difficulty)', () => {
  it('easy fans are a little wider than the old 30/36 deg; normal/hard are wider and fuller still in stages 2-3', () => {
    expect(BOSS_FAN.easy).toEqual({ 2: { count: [2, 3], spreadDeg: 38 }, 3: { count: [2, 3], spreadDeg: 46 } });
    for (const st of [2, 3]) for (const k of ['normal', 'hard']) {
      expect(bossFan(st, k).spreadDeg).toBeGreaterThan(bossFan(st, 'easy').spreadDeg);
      expect(bossFan(st, k).count[1]).toBeGreaterThanOrEqual(bossFan(st, 'easy').count[1]);
    }
    expect(bossFan(3, 'hard').spreadDeg).toBeGreaterThan(bossFan(3, 'normal').spreadDeg);
    expect(bossFan(1, 'normal')).toBeNull();
    expect(bossFan(2, 'zzz')).toBe(BOSS_FAN.normal[2]);
  });
  it('a fan never aims sideways past the clamp (fanVelocities keeps vy > 0) at the widest spread', () => {
    for (const k of ['easy', 'normal', 'hard']) for (const st of [2, 3]) {
      const f = bossFan(st, k);
      for (const v of fanVelocities(35, f.count[1], f.spreadDeg, 400)) expect(v.vy).toBeGreaterThan(0);
    }
  });
  it('one volley leaves room in the bullet pool (max fan + 1 aimed shot, a few volleys in flight, escort shots)', () => {
    for (const k of ['easy', 'normal', 'hard']) for (const st of [2, 3]) {
      const worst = bossFan(st, k).count[1] + 1;
      expect(worst * 3 + 3 * 2).toBeLessThanOrEqual(48);
    }
  });
});

describe('bossStageFromHp (overflow damage is not carried over)', () => {
  it('next stage starts with its full hp whatever the overshoot', () => {
    expect(bossStageFromHp({ stage: 1, hp: -2, diffKey: 'normal' })).toEqual({ stage: 2, hp: BOSS_HP.normal[1], cleared: false });
    expect(bossStageFromHp({ stage: 2, hp: 0, diffKey: 'hard' })).toEqual({ stage: 3, hp: BOSS_HP.hard[2], cleared: false });
    expect(bossStageFromHp({ stage: 1, hp: 3, diffKey: 'easy' })).toEqual({ stage: 1, hp: 3, cleared: false });
  });
  it('the last stage clears', () => {
    expect(bossStageFromHp({ stage: 3, hp: -1, diffKey: 'normal' }).cleared).toBe(true);
    expect(bossStageFromHp({ stage: 3, hp: 0, diffKey: 'normal' }).cleared).toBe(true);
  });
});

describe('boss balance (damage by charge temperature)', () => {
  const hotter = armor => STAR_COLORS.find(c => chargeLevel(c.key) === chargeLevel(armor) + 1)?.key;
  it('bossHp reads the difficulty table (normal for unknown)', () => {
    expect(bossHp(1, 'hard')).toBe(BOSS_HP.hard[0]);
    expect(bossHp(3, 'easy')).toBe(BOSS_HP.easy[2]);
    expect(bossHp(2, 'zzz')).toBe(BOSS_HP.normal[1]);
  });
  it('armor-colored beams need hp / BOSS_DAMAGE_UNIT hits; one hotter step needs fewer (where a hotter color exists)', () => {
    expect(BOSS_DAMAGE_UNIT).toBe(3);
    for (const diff of ['easy', 'normal', 'hard']) for (const stage of [1, 2, 3]) {
      const armor = bossArmorColor(stage, diff);
      const hp = bossHp(stage, diff);
      expect(hp % BOSS_DAMAGE_UNIT).toBe(0);
      expect(hitsToDown(armor, armor, hp, BOSS_DAMAGE_UNIT)).toBe(hp / BOSS_DAMAGE_UNIT);
      if (hotter(armor)) expect(hitsToDown(hotter(armor), armor, hp, BOSS_DAMAGE_UNIT)).toBeLessThan(hp / BOSS_DAMAGE_UNIT);
    }
  });
  it('hp never drops from one stage to the next', () => {
    for (const diff of ['easy', 'normal', 'hard']) {
      expect(bossHp(2, diff)).toBeGreaterThanOrEqual(bossHp(1, diff));
      expect(bossHp(3, diff)).toBeGreaterThanOrEqual(bossHp(2, diff));
    }
  });
  it('a BLUE charge needs 1.5x..2x the hits of the 2026-11-07 table (easy 6, normal 9, hard 13 in all)', () => {
    const before = { easy: 6, normal: 9, hard: 13 };
    for (const diff of ['easy', 'normal', 'hard']) {
      const blue = [1, 2, 3].reduce((a, st) => a + hitsToDown('blue', bossArmorColor(st, diff), bossHp(st, diff), BOSS_DAMAGE_UNIT), 0);
      expect(blue / before[diff]).toBeGreaterThanOrEqual(1.5);
      expect(blue / before[diff]).toBeLessThanOrEqual(2);
    }
  });
  it('even a BLUE charge needs at least 2 hits per stage on easy and 4 on normal and hard', () => {
    for (const diff of ['easy', 'normal', 'hard']) for (const stage of [1, 2, 3]) {
      expect(hitsToDown('blue', bossArmorColor(stage, diff), bossHp(stage, diff), BOSS_DAMAGE_UNIT)).toBeGreaterThanOrEqual(diff === 'easy' ? 2 : 4);
    }
  });
  it('hard armor: stage 3 is blue (only blue pierces)', () => {
    expect(BOSS_ARMOR.hard[2]).toBe('blue');
    expect(bossArmorColor(3, 'hard')).toBe('blue');
  });
  it('armor-colored hit totals: easy 15 (the 900 s easy cap), normal and hard clearly more', () => {
    const tot = k => BOSS_HP[k].reduce((a, b) => a + b, 0) / BOSS_DAMAGE_UNIT;
    expect(tot('easy')).toBe(15);
    expect(tot('normal')).toBeGreaterThanOrEqual(20);
    expect(tot('hard')).toBeGreaterThanOrEqual(20);
  });
  it('bossFightSec = per stage find time + armor-colored shots x seconds per shot, and fits the time limit', () => {
    for (const diff of ['easy', 'normal', 'hard']) {
      const want = [1, 2, 3].reduce((a, st) => a + BOSS_STAGE_FIND_SEC + hitsToDown(bossArmorColor(st, diff), bossArmorColor(st, diff), bossHp(st, diff), BOSS_DAMAGE_UNIT) * M3_SEC_PER_SHOT, 0);
      expect(bossFightSec(diff)).toBe(want);
      expect(bossFightSec(diff)).toBeLessThan(M4_TIME_LIMIT_SEC);
    }
  });
  it('easy stays at the old 150 s; normal is noticeably longer (170..210 s)', () => {
    expect(bossFightSec('easy')).toBe(150);
    expect(bossFightSec('normal')).toBeGreaterThanOrEqual(170);
    expect(bossFightSec('normal')).toBeLessThanOrEqual(M4_TIME_LIMIT_SEC);
    expect(bossFightSec('hard')).toBeGreaterThan(bossFightSec('easy'));
  });
});

describe('bossVolleyShots: the aimed shot never sits on a fan bullet', () => {
  const angles = v => v.map(s => Math.atan2(s.vx, s.vy) * 180 / Math.PI).sort((a, b) => a - b);
  const minGap = a => a.slice(1).reduce((m, x, i) => Math.min(m, x - a[i]), Infinity);
  const from = { x: 360, y: BOSS_POS.y + BOSS_MUZZLE_DY };
  it('no two velocities of an aimed volley are equal (>= 5 deg apart) for every fan size, difficulty, ship position', () => {
    for (const diffKey of ['normal', 'hard']) for (const stage of [2, 3]) {
      for (const r of [0, 0.5, 0.9999]) for (const x of [20, 150, 300, 360, 420, 600, 700]) for (const y of [600, 800, 900, 960]) {
        const v = bossVolleyShots({ stage, diffKey, from, ship: { x, y }, speed: 400, aim: true, rng: () => r });
        const fan = bossFan(stage, diffKey);
        expect(v.length).toBeGreaterThanOrEqual(fan.count[0] + 1);
        expect(minGap(angles(v))).toBeGreaterThanOrEqual(5);
      }
    }
  });
  it('also holds when the ship is above the muzzle or exactly beneath it (degenerate aim)', () => {
    for (const diffKey of ['normal', 'hard']) for (const stage of [2, 3]) for (const r of [0, 0.5, 0.9999]) {
      for (const ship of [{ x: 360, y: 300 }, { x: 100, y: 300 }, { x: 360, y: 700 }]) {
        const v = bossVolleyShots({ stage, diffKey, from, ship, speed: 400, aim: true, rng: () => r });
        expect(minGap(angles(v))).toBeGreaterThan(0.5);
      }
    }
  });
  it('unaimed: just the fan (no extra shot); stage 1: one straight shot; every shot goes down', () => {
    const f = bossFan(3, 'hard');
    const v = bossVolleyShots({ stage: 3, diffKey: 'hard', from, ship: { x: 100, y: 900 }, speed: 400, aim: false, rng: () => 0.9999 });
    expect(v).toHaveLength(f.count[1]);
    const one = bossVolleyShots({ stage: 1, diffKey: 'hard', from, ship: { x: 100, y: 900 }, speed: 400, aim: true });
    expect(one).toHaveLength(1);
    for (const s of [...v, ...one]) expect(s.vy).toBeGreaterThan(0);
  });
  it('easy never aims (aim false) so it fires just the fan', () => {
    const v = bossVolleyShots({ stage: 2, diffKey: 'easy', from, ship: { x: 100, y: 900 }, speed: 300, aim: false, rng: () => 0 });
    expect(v).toHaveLength(2);
  });
});

describe('escort drones (m4)', () => {
  it('escortTarget: none in stage 1; at most 1 on easy, 1 on normal, 2 on hard; never fewer in a later stage', () => {
    for (const k of ['easy', 'normal', 'hard']) {
      expect(escortTarget(1, k)).toBe(0);
      expect(escortTarget(2, k)).toBeLessThanOrEqual(escortTarget(3, k));
    }
    expect(Math.max(...[1, 2, 3].map(st => escortTarget(st, 'easy')))).toBeLessThanOrEqual(1);
    expect(Math.max(...[1, 2, 3].map(st => escortTarget(st, 'normal')))).toBe(1);
    expect(Math.max(...[1, 2, 3].map(st => escortTarget(st, 'hard')))).toBe(2);
    expect(escortTarget(2, 'zzz')).toBe(BOSS_ESCORTS.normal[2]);
    expect(escortTarget(9, 'hard')).toBe(0);
  });
  it('hover lanes keep the whole drone body below the boss hull and well above the ship start row', () => {
    const hullBottom = BOSS_POS.y + BOSS_MUZZLE_DY;
    expect(Math.min(...BOSS_ESCORT_LANES_Y) - 34).toBeGreaterThan(hullBottom);
    expect(Math.max(...BOSS_ESCORT_LANES_Y)).toBeLessThan(SHIP_START_Y - 100);
  });
  it('droneShot from every hover row toward the ship start row is never null on any difficulty (so the escort shots counted in the heat model really fire)', () => {
    for (const diffKey of ['easy', 'normal', 'hard']) for (const tier of [0, 3]) for (const rng of [0, 0.3, 0.9999]) {
      for (const y of BOSS_ESCORT_LANES_Y) for (const aimAllowed of [false, true]) {
        const s = droneShot({ drone: { x: 300, y }, ship: { x: 500, y: SHIP_START_Y }, diffKey, tier, aimAllowed, warmup: false, rng: () => rng, minSpeed: BOSS_ESCORT_MIN_SHOT_SPEED });
        expect(s).not.toBeNull();
      }
    }
  });
  it('escorts shoot slower on easier difficulties, never faster than every 3 s', () => {
    for (const k of ['easy', 'normal', 'hard']) expect(BOSS_ESCORT_FIRE_MS[k]).toBeGreaterThanOrEqual(3000);
    expect(BOSS_ESCORT_FIRE_MS.easy).toBeGreaterThan(BOSS_ESCORT_FIRE_MS.normal);
    expect(BOSS_ESCORT_FIRE_MS.normal).toBeGreaterThan(BOSS_ESCORT_FIRE_MS.hard);
  });
});
