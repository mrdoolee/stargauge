import { describe, it, expect } from 'vitest';
import {
  FORMATION_IDS,
  EASY_FORMATION_IDS,
  pickFormation,
  buildFormation,
  escapeGapOk,
} from '../../src/logic/formations.js';
import { seededRng } from '../../src/logic/rng.js';

const SIDES = ['left', 'center', 'right'];
const MIN_X = 70;
const MAX_X = 650;
const SHIP_W = 64;

describe('seededRng', () => {
  it('is deterministic and within [0,1)', () => {
    const a = seededRng(5);
    const b = seededRng(5);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('pickFormation', () => {
  it('never repeats the previous formation or side', () => {
    for (const diffKey of ['easy', 'normal', 'hard']) {
      for (const aimAllowed of [false, true]) {
        const rng = seededRng(11);
        let prev = { id: null, side: null };
        for (let i = 0; i < 1000; i++) {
          const next = pickFormation({ prevId: prev.id, prevSide: prev.side, diffKey, aimAllowed, rng });
          expect(FORMATION_IDS).toContain(next.id);
          expect(SIDES).toContain(next.side);
          if (i > 0) {
            expect(next.id).not.toBe(prev.id);
            expect(next.side).not.toBe(prev.side);
          }
          prev = next;
        }
      }
    }
  });

  it('easy only gets line/vee/diagonal and never aimed', () => {
    const rng = seededRng(3);
    let prev = { id: null, side: null };
    for (let i = 0; i < 500; i++) {
      prev = pickFormation({ prevId: prev.id, prevSide: prev.side, diffKey: 'easy', aimAllowed: true, rng });
      expect(EASY_FORMATION_IDS).toContain(prev.id);
    }
  });

  it('aimed only when aimAllowed', () => {
    const seen = { off: new Set(), on: new Set() };
    for (const [key, aimAllowed] of [['off', false], ['on', true]]) {
      const rng = seededRng(9);
      let prev = { id: null, side: null };
      for (let i = 0; i < 1000; i++) {
        prev = pickFormation({ prevId: prev.id, prevSide: prev.side, diffKey: 'hard', aimAllowed, rng });
        seen[key].add(prev.id);
      }
    }
    expect(seen.off.has('aimed')).toBe(false);
    expect(seen.on.has('aimed')).toBe(true);
  });
});

describe('buildFormation', () => {
  const cases = [];
  for (const id of FORMATION_IDS) {
    for (const side of SIDES) {
      for (const count of [3, 4, 5]) {
        for (let seed = 1; seed <= 200; seed++) cases.push({ id, side, count, seed });
      }
    }
  }

  it('every built formation leaves an escape gap', () => {
    for (const { id, side, count, seed } of cases) {
      const slots = buildFormation({ id, side, count, minX: MIN_X, maxX: MAX_X, rng: seededRng(seed) });
      const ok = escapeGapOk(slots, { shipWidth: SHIP_W, minX: MIN_X, maxX: MAX_X });
      if (!ok) throw new Error(`no gap: ${id} ${side} ${count} seed ${seed} ${JSON.stringify(slots)}`);
    }
  });

  it('slots stay inside [minX, maxX], delays start at 0 and never decrease', () => {
    const bad = [];
    for (const { id, side, count, seed } of cases) {
      const slots = buildFormation({ id, side, count, minX: MIN_X, maxX: MAX_X, rng: seededRng(seed) });
      const tag = `${id} ${side} ${count} ${seed}`;
      if (slots.length !== (id === 'aimed' ? 1 : count)) bad.push(`${tag} length`);
      if (slots[0].delayMs !== 0) bad.push(`${tag} first delay`);
      slots.forEach((s, i) => {
        if (s.x < MIN_X || s.x > MAX_X) bad.push(`${tag} x`);
        if (i > 0 && s.delayMs < slots[i - 1].delayMs) bad.push(`${tag} delay order`);
        if (s.aim !== (id === 'aimed')) bad.push(`${tag} aim`);
        if (id === 'zigzag') {
          const z = s.zigzag;
          if (!z || z.amp <= 0 || z.periodMs <= 0 || s.x - z.amp < MIN_X || s.x + z.amp > MAX_X) bad.push(`${tag} zigzag`);
        } else if (s.zigzag !== null) bad.push(`${tag} zigzag not null`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('diagonal drifts away from its side; pincer closes inward', () => {
    const d = (side) => buildFormation({ id: 'diagonal', side, count: 4, minX: MIN_X, maxX: MAX_X, rng: seededRng(1) });
    expect(d('left').every((s) => s.vx > 0)).toBe(true);
    expect(d('right').every((s) => s.vx < 0)).toBe(true);
    const p = buildFormation({ id: 'pincer', side: 'center', count: 4, minX: MIN_X, maxX: MAX_X, rng: seededRng(1) });
    for (const s of p) expect(s.vx * (360 - s.x)).toBeGreaterThan(0);
  });
});

describe('escapeGapOk', () => {
  const opts = { shipWidth: 64, minX: 70, maxX: 650 };
  it('rejects a wall of objects and accepts a spaced row', () => {
    const wall = [100, 190, 280, 370, 460, 550, 640].map((x) => ({ delayMs: 0, x }));
    expect(escapeGapOk(wall, opts)).toBe(false);
    expect(escapeGapOk([{ delayMs: 0, x: 360 }], opts)).toBe(true);
  });
  it('ignores slots far apart in time', () => {
    const slots = [100, 190, 280, 370, 460, 550, 640].map((x, i) => ({ delayMs: i * 1000, x }));
    expect(escapeGapOk(slots, opts)).toBe(true);
  });

  it('counts a zigzag slot by its swept footprint, not plain vx drift', () => {
    const blocker = (zigzag) => [
      { delayMs: 0, x: 150, vx: 0, zigzag: null },
      { delayMs: 0, x: 570, vx: 0, zigzag: null },
      { delayMs: 0, x: 360, vx: 0, zigzag },
    ];
    expect(escapeGapOk(blocker(null), opts)).toBe(true);
    expect(escapeGapOk(blocker({ amp: 80, periodMs: 1800 }), opts)).toBe(false);
    const drift = [{ delayMs: 0, x: 360, vx: 300, zigzag: null }];
    expect(escapeGapOk(drift, opts)).toBe(true);
  });
});

import { zigzagVx } from '../../src/logic/formations.js';

describe('zigzagVx', () => {
  const z = { amp: 60, periodMs: 2000 };
  it('null zigzag leaves vx alone', () => {
    expect(zigzagVx(15, null, 123)).toBe(15);
  });
  it('t=0 is baseVx + amp*2pi*1000/period', () => {
    expect(zigzagVx(10, z, 0)).toBeCloseTo(10 + (60 * 2 * Math.PI * 1000) / 2000, 6);
  });
  it('t=period/4 equals baseVx', () => {
    expect(zigzagVx(10, z, 500)).toBeCloseTo(10, 6);
  });
});
