import { describe, it, expect } from 'vitest';
import { estimateFlow, buildResultSummary, clearRunKeys, PACE } from '../../src/logic/flow.js';
import { DRONE_HP, DRONE_SHIELDS, M3_DRONE_FIND_SEC, M3_SEC_PER_SHOT } from '../../src/config/balance.js';
import { hitsToDown } from '../../src/logic/charge.js';
import { bossFightSec } from '../../src/logic/boss.js';

describe('estimateFlow', () => {
  it('rows sum to total and cover every stage', () => {
    const e = estimateFlow();
    expect(e.rows.map(r => r.id)).toEqual([
      'title', 'briefing-m1', 'm1', 'briefing-m2', 'm2', 'briefing-m3', 'm3', 'briefing-m4', 'm4', 'report', 'result',
    ]);
    expect(e.rows.reduce((a, r) => a + r.sec, 0)).toBeCloseTo(e.totalSec, 5);
  });
  it('briefing rows are 25 s each', () => {
    for (const r of estimateFlow().rows.filter(x => x.id.startsWith('briefing-'))) expect(r.sec).toBe(25);
  });
  it('easy lands at or under 15 minutes', () => {
    expect(estimateFlow({ difficulty: 'easy' }).totalSec).toBeLessThanOrEqual(900);
  });
  it('normal and hard take longer than easy', () => {
    const easy = estimateFlow({ difficulty: 'easy' }).totalSec;
    expect(estimateFlow({ difficulty: 'normal' }).totalSec).toBeGreaterThan(easy);
    expect(estimateFlow({ difficulty: 'hard' }).totalSec).toBeGreaterThan(easy);
  });
  it('more m1 goals or slower spawns lengthen m1; m4 is capped by the time limit', () => {
    const base = estimateFlow().rows.find(r => r.id === 'm1').sec;
    expect(estimateFlow({ goals: { m1: 40 } }).rows.find(r => r.id === 'm1').sec).toBeGreaterThan(base);
    expect(estimateFlow({ gaps: { m1: 6000, m2: 4000, m3: 3000, m4: 0 } }).rows.find(r => r.id === 'm1').sec).toBeGreaterThan(base);
    const m4 = estimateFlow({ m4Limit: 30 }).rows.find(r => r.id === 'm4').sec;
    expect(m4).toBeLessThan(estimateFlow({ m4Limit: 300 }).rows.find(r => r.id === 'm4').sec);
  });
  it('m3 = read + goal drones x seconds per drone + card; more drones take longer', () => {
    const m3 = (droneGoal, difficulty) => estimateFlow({ droneGoal, difficulty }).rows.find(r => r.id === 'm3').sec;
    const g = { easy: 5, normal: 6, hard: 8 };
    expect(m3(g, 'normal')).toBe(PACE.read.m3 + 6 * PACE.m3SecPerDrone + PACE.read.card);
    expect(m3(g, 'easy')).toBe(PACE.read.m3 + 5 * PACE.m3SecPerDrone + PACE.read.card);
    expect(m3({ ...g, normal: 12 }, 'normal')).toBeGreaterThan(m3(g, 'normal'));
  });
  it('m3SecPerDrone = find time + shots to down x seconds per shot (charge = the shield color: the conservative case)', () => {
    expect(DRONE_HP).toBe(3);
    for (const shields of Object.values(DRONE_SHIELDS)) {
      for (const shield of Object.keys(shields)) expect(hitsToDown(shield, shield, DRONE_HP)).toBe(DRONE_HP);
    }
    expect(PACE.m3SecPerDrone).toBe(M3_DRONE_FIND_SEC + DRONE_HP * M3_SEC_PER_SHOT);
  });
  it('m4 = read + min(limit, boss estimate) + questions/chart read, and has no picture pace', () => {
    expect(PACE.read).not.toHaveProperty('picture');
    expect(estimateFlow({ m4Limit: 1000 }).rows.find(r => r.id === 'm4').sec).toBe(PACE.read.m4 + PACE.m4BossSec + PACE.read.chart);
    expect(estimateFlow({ m4Limit: 30 }).rows.find(r => r.id === 'm4').sec).toBe(PACE.read.m4 + 30 + PACE.read.chart);
  });
});

describe('buildResultSummary', () => {
  it('collects stars, quiz score and gauge', () => {
    const s = buildResultSummary({
      results: { m1: { stars: 3 }, m2: { stars: 2 }, m3: { stars: 1 }, m4: { stars: 3 }, quiz: { correct: 2, total: 3 } },
      gaugeFinal: ['blue'], measuredCounts: { red: 2, blue: 3, white: 1 },
    });
    expect(s.missions.map(m => m.stars)).toEqual([3, 2, 1, 3]);
    expect(s.quizText).toBe('2 / 3');
    expect(s).not.toHaveProperty('orionTagged');
    expect(s.measuredCounts.map(c => c.key)).toEqual(['blue', 'blueWhite', 'white', 'yellowWhite', 'yellow', 'orange', 'red']);
    expect(s.measuredCounts.map(c => c.count)).toEqual([3, 0, 1, 0, 0, 0, 2]);
    expect(s.gauge).toEqual(['blue']);
  });
  it('is safe on an empty registry and clamps stars to 1-3', () => {
    const s = buildResultSummary({});
    expect(s.missions.map(m => m.stars)).toEqual([1, 1, 1, 1]);
    expect(s.quizText).toBe('0 / 3');
    expect(s.gauge).toHaveLength(7);
    expect(s.measuredCounts).toBeNull();
  });
  it('measuredCounts is null when absent or all zero, and tolerates junk', () => {
    expect(buildResultSummary({ measuredCounts: {} }).measuredCounts).toBeNull();
    expect(buildResultSummary({ measuredCounts: { blue: 0 } }).measuredCounts).toBeNull();
    expect(buildResultSummary({ measuredCounts: 'x' }).measuredCounts).toBeNull();
    expect(buildResultSummary({ measuredCounts: { blue: -2, red: 'a', white: 2.7 } }).measuredCounts.map(c => c.count)).toEqual([0, 0, 2, 0, 0, 0, 0]);
  });
});

describe('clearRunKeys', () => {
  it('lists the keys a restart must clear, never muted', () => {
    expect(clearRunKeys).toEqual(['results', 'gaugeFinal', 'measuredCounts']);
    expect(clearRunKeys).not.toContain('muted');
  });
});

describe('estimateFlow vs the spec split', () => {
  // spec: m1 ~2 min, m2 ~4, m3 ~3, m4 ~4, m5 (report) 1-2 min (1.5 used). Each estimate within +-30%.
  const SPEC = { m1: 120, m2: 240, m3: 180, m4: 240, report: 90 };
  for (const [id, target] of Object.entries(SPEC)) {
    it(`${id} within 30% of ${target}s`, () => {
      const sec = estimateFlow().rows.find(r => r.id === id).sec;
      expect(sec).toBeGreaterThanOrEqual(target * 0.7);
      expect(sec).toBeLessThanOrEqual(target * 1.3);
    });
  }
  it('shortens the practice window to 15 s (teacher: boring)', async () => {
    const { M1_PRACTICE_SEC } = await import('../../src/config/balance.js');
    expect(M1_PRACTICE_SEC).toBe(15);
  });
});

describe('estimateFlow per difficulty', () => {
  const min = d => estimateFlow({ difficulty: d }).totalSec / 60;
  it('normal equals the default estimate', () => {
    expect(estimateFlow({ difficulty: 'normal' }).totalSec).toBe(estimateFlow().totalSec);
  });
  // Hard cap 16 -> 17 min (2026-11-07, controller ruling in .superpowers/sdd/boss-hard/brief.md): the boss fight got longer
  // (hard 150 -> 192 s) and hard was at 15.8 min, so only that growth moves the cap, by at most one minute. Easy stays <= 900 s (above).
  // 2026-11-13 (teacher): m2 on normal/hard needs two hits per color (M2_HITS_PER_COLOR), ~+1.8 min there (m2 175 -> 282 s normal),
  // so the normal/hard cap moves 17 -> 19 min. Easy is unchanged (one hit per color) and stays <= 17 min (and <= 900 s above).
  it('easy finishes within 17 minutes, normal and hard within 19', () => {
    expect(min('easy')).toBeLessThanOrEqual(17);
    expect(min('normal')).toBeLessThanOrEqual(19);
    expect(min('hard')).toBeLessThanOrEqual(19);
  });
  it('the boss fight is the long part of the run on normal and hard (bossFightSec 170..210 s) and easy stays at 150 s', () => {
    expect(bossFightSec('easy')).toBe(150);
    for (const d of ['normal', 'hard']) {
      expect(bossFightSec(d)).toBeGreaterThanOrEqual(170);
      expect(bossFightSec(d)).toBeLessThanOrEqual(210);
      expect(estimateFlow({ difficulty: d }).rows.find(r => r.id === 'm4').sec).toBe(PACE.read.m4 + bossFightSec(d) + PACE.read.chart);
    }
  });
  it('all difficulties stay above 12 minutes', () => {
    for (const d of ['easy', 'normal', 'hard']) expect(min(d)).toBeGreaterThanOrEqual(12);
  });
  it('unknown difficulty behaves as normal', () => {
    expect(estimateFlow({ difficulty: 'zzz' }).totalSec).toBe(estimateFlow().totalSec);
  });
});

describe('clearRunKeys keeps preferences', () => {
  it('keeps difficulty and muted', () => {
    expect(clearRunKeys).not.toContain('difficulty');
    expect(clearRunKeys).not.toContain('muted');
  });
});
