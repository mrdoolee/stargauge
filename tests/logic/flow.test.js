import { describe, it, expect } from 'vitest';
import { estimateFlow, buildResultSummary, clearRunKeys } from '../../src/logic/flow.js';

describe('estimateFlow', () => {
  it('rows sum to total and cover every stage', () => {
    const e = estimateFlow();
    expect(e.rows.map(r => r.id)).toEqual(['title', 'm1', 'm2', 'm3', 'm4', 'report', 'result']);
    expect(e.rows.reduce((a, r) => a + r.sec, 0)).toBeCloseTo(e.totalSec, 5);
  });
  it('default balance lands in the 14-16 minute target', () => {
    const { totalSec } = estimateFlow();
    expect(totalSec).toBeGreaterThanOrEqual(14 * 60);
    expect(totalSec).toBeLessThanOrEqual(16 * 60);
  });
  it('more m1 goals or slower spawns lengthen m1; m4 is capped by the time limit', () => {
    const base = estimateFlow().rows.find(r => r.id === 'm1').sec;
    expect(estimateFlow({ goals: { m1: 40, m3a: 1 } }).rows.find(r => r.id === 'm1').sec).toBeGreaterThan(base);
    expect(estimateFlow({ spawn: { m1: 3000, m2: 900, m3: 1400, m4: 800 } }).rows.find(r => r.id === 'm1').sec).toBeGreaterThan(base);
    const m4 = estimateFlow({ m4Limit: 30 }).rows.find(r => r.id === 'm4').sec;
    expect(m4).toBeLessThan(estimateFlow({ m4Limit: 300 }).rows.find(r => r.id === 'm4').sec);
  });
});

describe('buildResultSummary', () => {
  it('collects stars, quiz score and gauge', () => {
    const s = buildResultSummary({
      results: { m1: { stars: 3 }, m2: { stars: 2 }, m3: { stars: 1 }, m4: { stars: 3 }, quiz: { correct: 2, total: 3 } },
      orionTagged: ['rigel'], gaugeFinal: ['blue'],
    });
    expect(s.missions.map(m => m.stars)).toEqual([3, 2, 1, 3]);
    expect(s.quizText).toBe('2 / 3');
    expect(s.orionTagged).toEqual(['rigel']);
    expect(s.gauge).toEqual(['blue']);
  });
  it('is safe on an empty registry and clamps stars to 1-3', () => {
    const s = buildResultSummary({});
    expect(s.missions.map(m => m.stars)).toEqual([1, 1, 1, 1]);
    expect(s.quizText).toBe('0 / 3');
    expect(s.gauge).toHaveLength(7);
  });
});

describe('clearRunKeys', () => {
  it('lists the keys a restart must clear, never muted', () => {
    expect(clearRunKeys).toEqual(expect.arrayContaining(['results', 'orionTagged', 'gaugeFinal']));
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
  it('keeps the practice window at the spec 30 s', async () => {
    const { M1_PRACTICE_SEC } = await import('../../src/config/balance.js');
    expect(M1_PRACTICE_SEC).toBe(30);
  });
});

describe('estimateFlow per difficulty', () => {
  const min = d => estimateFlow({ difficulty: d }).totalSec / 60;
  it('normal equals the default estimate', () => {
    expect(estimateFlow({ difficulty: 'normal' }).totalSec).toBe(estimateFlow().totalSec);
  });
  it('easy and normal finish within 17 minutes, hard within 16', () => {
    expect(min('easy')).toBeLessThanOrEqual(17);
    expect(min('normal')).toBeLessThanOrEqual(17);
    expect(min('hard')).toBeLessThanOrEqual(16);
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
