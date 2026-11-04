import { describe, it, expect } from 'vitest';
import { bossStage, bossCycle, fanVelocities, pickLaunchSource, pickLaunchOrigin, bossWarmup } from '../../src/logic/boss.js';
import { canLaunch, speedBand, topEntryReactionSec } from '../../src/logic/speed.js';
import { clusterPosition } from '../../src/logic/jewelbox.js';
import { JEWELBOX } from '../../src/data/stars.js';
import {
  BOSS_ATTACK_MS, BOSS_GAP_MS, M4_CLUSTER_AREA, SHIP_START_Y, WARMUP_MS, WARMUP_DENSITY,
  REACTION_FLOOR_SEC,
} from '../../src/config/balance.js';

const member = (y, colorKey = 'blue', boss = false) => ({ obj: { x: 300, y }, star: { colorKey }, boss });
const realMembers = () => JEWELBOX.map(s => {
  const p = clusterPosition(s, M4_CLUSTER_AREA);
  return { obj: { x: p.x, y: p.y }, star: s, boss: !!s.isSupergiant };
});
const ship = { x: 360, y: SHIP_START_Y };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

describe('bossStage', () => {
  it('follows the tagged fraction', () => {
    expect(bossStage(0)).toBe(1);
    expect(bossStage(0.33)).toBe(1);
    expect(bossStage(0.34)).toBe(2);
    expect(bossStage(0.67)).toBe(3);
    expect(bossStage(1)).toBe(3);
  });
});

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

describe('pickLaunchSource', () => {
  it('has no eligible source when the ship is closer than floor x tier-0 minimum', () => {
    // hard hazard floor 0.5 s, tier-0 min 640 px/s -> need 320 px above the ship
    const near = member(700);
    expect(pickLaunchSource([near], ship, { diffKey: 'hard', tier: 0 })).toBeNull();
    const far = member(560);
    const r = pickLaunchSource([far], ship, { diffKey: 'hard', tier: 0 });
    expect(r.member).toBe(far);
  });

  it('never returns a speed that violates canLaunch', () => {
    for (const diffKey of ['easy', 'normal', 'hard']) for (let tier = 0; tier < 4; tier++) {
      for (let i = 0; i < 40; i++) {
        const r = pickLaunchSource(realMembers(), ship, { diffKey, tier });
        if (!r) continue;
        expect(canLaunch({ fromY: r.member.obj.y, shipY: ship.y, speedPxS: r.speedPxS, category: 'hazard', diffKey })).toBe(true);
        expect(r.speedPxS).toBeGreaterThanOrEqual(speedBand('hazard', diffKey, 0).min - 1e-6);
      }
    }
  });

  it('only uses non-boss blue sources', () => {
    const members = [member(500, 'red', true), member(500, 'white'), member(520, 'blue')];
    for (let i = 0; i < 20; i++) {
      expect(pickLaunchSource(members, ship, { diffKey: 'easy', tier: 0 }).member).toBe(members[2]);
    }
  });

  it('easy at ship y 900 always gets a source from the real layout', () => {
    for (let i = 0; i < 100; i++) {
      expect(pickLaunchSource(realMembers(), ship, { diffKey: 'easy', tier: 0 })).not.toBeNull();
    }
  });

  it('hard at tier 3 and ship y 900 still gets a (capped) source', () => {
    const r = pickLaunchSource(realMembers(), ship, { diffKey: 'hard', tier: 3, rng: seq(0.99) });
    expect(r).not.toBeNull();
    expect(r.speedPxS).toBeLessThan(speedBand('hazard', 'hard', 3).max);
  });
});

describe('pickLaunchOrigin (boss never goes silent)', () => {
  const raised = { x: 360, y: 700 };
  it('still launches on every difficulty with the ship raised to y 700', () => {
    for (const diffKey of ['easy', 'normal', 'hard']) {
      for (let r = 0; r < 20; r++) {
        const o = pickLaunchOrigin(realMembers(), raised, { diffKey, tier: 0, rng: Math.random, offsetY: 30 });
        expect(o).toBeTruthy();
        expect(o.speedPxS).toBeGreaterThan(0);
        expect(Number.isFinite(o.x)).toBe(true);
      }
    }
  });
  it('prefers a cluster source when one is eligible', () => {
    const o = pickLaunchOrigin(realMembers(), ship, { diffKey: 'easy', tier: 0, rng: seq(0.1), offsetY: 30 });
    expect(o.fromCluster).toBe(true);
    expect(o.y).toBeGreaterThan(0);
  });
  it('falls back to the top edge at a blue member x when no source qualifies', () => {
    const o = pickLaunchOrigin(realMembers(), raised, { diffKey: 'hard', tier: 0, rng: seq(0.3), offsetY: 30 });
    expect(o.fromCluster).toBe(false);
    expect(o.y).toBeLessThan(0);
    const blueXs = realMembers().filter(m => !m.boss && m.star.colorKey === 'blue').map(m => m.obj.x);
    expect(blueXs).toContain(o.x);
  });
  it('top-edge launches satisfy the hazard top-entry floor at tier 3', () => {
    for (const diffKey of ['easy', 'normal', 'hard']) {
      for (let r = 0; r < 50; r++) {
        const o = pickLaunchOrigin(realMembers(), raised, { diffKey, tier: 3, rng: Math.random, offsetY: 30 });
        if (o.fromCluster) continue;
        expect(topEntryReactionSec(o.speedPxS)).toBeGreaterThanOrEqual(REACTION_FLOOR_SEC.hazard[diffKey]);
      }
    }
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

import { bossStageFromHp, bossShotSpeed } from '../../src/logic/boss.js';
import { bossArmorColor, chargeLevel } from '../../src/logic/charge.js';
import { speedFor } from '../../src/logic/speed.js';
import { BOSS_HP, BOSS_POS, BOSS_MUZZLE_DY, BOSS_SWAY, HUD_BAND_BOTTOM, BOSS_WIDTH_PX } from '../../src/config/balance.js';

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
