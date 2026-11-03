import { describe, it, expect } from 'vitest';
import { WaveDirector } from '../../src/logic/waves.js';
import { seededRng } from '../../src/logic/rng.js';
import { WARMUP_MS } from '../../src/config/balance.js';

const base = { diffKey: 'hard', restarts: 0, gapMs: 2000, minX: 70, maxX: 650 };

/** Run the director for totalMs in dt steps; returns [{ t, slot }]. */
function run(dir, totalMs, dt = 50) {
  const out = [];
  for (let t = dt; t <= totalMs; t += dt) for (const slot of dir.update(dt)) out.push({ t, slot });
  return out;
}

/** Split emitted slots into formations: a silence longer than 1500 ms starts a new one. */
function groups(emitted) {
  const gs = [];
  let last = -Infinity;
  for (const e of emitted) {
    if (e.t - last > 1500) gs.push([]);
    gs[gs.length - 1].push(e);
    last = e.t;
  }
  return gs;
}

describe('WaveDirector', () => {
  it('first formation waits for the gap, then slots come out in delay order', () => {
    const dir = new WaveDirector({ ...base, diffKey: 'easy', rng: seededRng(3) });
    const em = run(dir, 8000);
    expect(em.length).toBeGreaterThanOrEqual(3);
    expect(em[0].t).toBeGreaterThanOrEqual(2000);
    const first = em.filter(e => e.t < em[0].t + 1500).map(e => e.slot);
    for (let i = 1; i < first.length; i++) expect(first[i].delayMs).toBeGreaterThanOrEqual(first[i - 1].delayMs);
    expect(first[0].formationId).toBeTruthy();
    expect(first[0].tier).toBe(0);
    expect(first[0].aimAllowed).toBe(false);
  });

  it('can emit several slots in one update, in delay order', () => {
    const dir = new WaveDirector({ ...base, diffKey: 'easy', rng: seededRng(5) });
    const out = dir.update(20000);
    expect(out.length).toBeGreaterThan(1);
    const first = out.filter(s => s.formationId === out[0].formationId).slice(0, 3);
    for (let i = 1; i < first.length; i++) expect(first[i].delayMs).toBeGreaterThanOrEqual(first[i - 1].delayMs);
  });

  it('warm-up: fewer slots and no aim in the first 12 s', () => {
    let warmN = 0, warmF = 0, laterN = 0, laterF = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const dir = new WaveDirector({ ...base, rng: seededRng(seed) });
      const em = run(dir, 90000);
      const warm = em.filter(e => e.t <= WARMUP_MS);
      expect(warm.every(e => !e.slot.aim && !e.slot.aimAllowed)).toBe(true);
      const count = gs => gs.filter(g => !g.some(e => e.slot.aim));
      const w = count(groups(warm));
      const l = count(groups(em.filter(e => e.t > WARMUP_MS + 3000)));
      warmN += w.reduce((a, g) => a + g.length, 0); warmF += w.length;
      laterN += l.reduce((a, g) => a + g.length, 0); laterF += l.length;
    }
    expect(warmN / warmF).toBeLessThan(laterN / laterF);
  });

  it('gap shrinks as the tier rises', () => {
    const gapBetween = (boost) => {
      const dir = new WaveDirector({ ...base, diffKey: 'normal', gapMs: 3000, rng: seededRng(9) });
      for (let i = 0; i < boost; i++) dir.onCorrect();
      const em = run(dir, 30000, 10);
      const first = em[0].t;
      const lastOfFirst = em.filter(e => e.t < first + 1500).at(-1).t;
      const second = em.find(e => e.t > lastOfFirst).t;
      return { tier: em[0].slot.tier, gap: second - lastOfFirst };
    };
    const calm = gapBetween(0);
    const tense = gapBetween(12);
    expect(tense.tier).toBeGreaterThan(calm.tier);
    expect(tense.gap).toBeLessThan(calm.gap);
  });

  it('restart mercy reaches the rank', () => {
    const a = new WaveDirector({ ...base, diffKey: 'normal', restarts: 0, rng: seededRng(1) });
    const b = new WaveDirector({ ...base, diffKey: 'normal', restarts: 2, rng: seededRng(1) });
    expect(b.rank.value).toBeLessThan(a.rank.value);
  });

  it('a zero gap never loops forever and update(0) is safe', () => {
    const dir = new WaveDirector({ ...base, gapMs: 0, rng: seededRng(2) });
    expect(Array.isArray(dir.update(0))).toBe(true);
    expect(Array.isArray(dir.update(500))).toBe(true);
  });
});
