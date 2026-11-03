import { describe, it, expect } from 'vitest';
import { toScreen, advanceGroup, fitLayout } from '../../src/logic/constellation.js';
import { CONSTELLATION_POS, ORION_BACKGROUND, NAMED_STARS } from '../../src/data/stars.js';

describe('toScreen', () => {
  it('maps normalized coords with north up and east left kept', () => {
    const o = { x: 100, y: 50 };
    expect(toScreen({ x: 0.5, y: 0.25 }, o, 400)).toEqual({ x: 300, y: 150 });
    const b = toScreen(CONSTELLATION_POS.betelgeuse, o, 400);
    const r = toScreen(CONSTELLATION_POS.rigel, o, 400);
    expect(b.y).toBeLessThan(r.y); // Betelgeuse (shoulder) above Rigel (foot)
    expect(b.x).toBeLessThan(r.x); // east (Betelgeuse side) on the left
  });
});

describe('advanceGroup', () => {
  it('drifts down by speed*dt', () => {
    expect(advanceGroup(0, 1000, { speed: 50, height: 500, screenH: 1280, margin: 100 })).toBe(50);
  });
  it('wraps above the screen once the whole group is off the bottom', () => {
    const y = advanceGroup(1340, 1000, { speed: 50, height: 500, screenH: 1280, margin: 100 });
    expect(y).toBe(-500 - 100);
  });
  it('does not wrap while any part is still visible', () => {
    expect(advanceGroup(1000, 10, { speed: 50, height: 500, screenH: 1280, margin: 100 })).toBeGreaterThan(1000);
  });
});

describe('fitLayout', () => {
  it('keeps every star of the layout inside the given box', () => {
    const pts = [...Object.values(CONSTELLATION_POS), ...ORION_BACKGROUND];
    const box = { x: 60, y: 200, w: 600, h: 650 };
    const { origin, scale } = fitLayout(pts, box);
    for (const p of pts) {
      const s = toScreen(p, origin, scale);
      expect(s.x).toBeGreaterThanOrEqual(box.x - 0.001);
      expect(s.x).toBeLessThanOrEqual(box.x + box.w + 0.001);
      expect(s.y).toBeGreaterThanOrEqual(box.y - 0.001);
      expect(s.y).toBeLessThanOrEqual(box.y + box.h + 0.001);
    }
  });
});

import {
  groupSprites, groupExtent, groupSwayX, groupBox, isTrapPathClear, trapKeepsEscapeGap,
  SPRITE_HALF, TRAP_SCALE, TRAP_GAP, SCREEN_EDGE, GROUP_SCALE, STAR_PX,
} from '../../src/logic/constellation.js';
import { M3_SWAY } from '../../src/config/balance.js';
import { buildFormation, pickFormation, escapeGapOk, zigzagVx } from '../../src/logic/formations.js';
import { speedFor } from '../../src/logic/speed.js';
import { seededRng } from '../../src/logic/rng.js';

const SPRITES = groupSprites(0);
const EXTENT = groupExtent(SPRITES);
const SW = { extent: EXTENT, screenW: 720, periodMs: M3_SWAY.periodMs };
const TRAP_HALF = SPRITE_HALF * TRAP_SCALE.max;
const GROUP_H = 1.65 * GROUP_SCALE;
const FIELD = { trapHalf: TRAP_HALF, screenH: 1280 };

describe('groupExtent', () => {
  it('is relative to originX and spans the sprites', () => {
    const e = groupExtent(groupSprites(185), 185);
    expect(e.left).toBeCloseTo(EXTENT.left);
    expect(e.right).toBeCloseTo(EXTENT.right);
    expect(EXTENT.left).toBeLessThan(0);
    expect(EXTENT.right).toBeGreaterThan(0);
  });
});

describe('group sway', () => {
  it('keeps the whole group on screen and reaches both sides', () => {
    let lo = Infinity, hi = -Infinity;
    for (let t = 0; t <= M3_SWAY.periodMs; t += 25) {
      const x = groupSwayX(t, SW);
      expect(x + EXTENT.left).toBeGreaterThanOrEqual(SCREEN_EDGE - 1e-6);
      expect(x + EXTENT.right).toBeLessThanOrEqual(720 - SCREEN_EDGE + 1e-6);
      lo = Math.min(lo, x); hi = Math.max(hi, x);
    }
    expect(hi - lo).toBeGreaterThanOrEqual(200);
  });
});

describe('groupBox', () => {
  it('covers every sprite horizontally and the group height vertically', () => {
    const b = groupBox(300, 100, SPRITES, GROUP_H);
    for (const s of SPRITES) {
      expect(b.left).toBeLessThanOrEqual(300 + s.x - s.half + 1e-6);
      expect(b.right).toBeGreaterThanOrEqual(300 + s.x + s.half - 1e-6);
    }
    expect(b.top).toBeLessThanOrEqual(100);
    expect(b.bottom).toBeGreaterThanOrEqual(100 + GROUP_H);
  });
});

describe('isTrapPathClear', () => {
  const still = tMs => groupBox(360, 400 + 0 * tMs, SPRITES, GROUP_H); // group parked mid-screen
  const box = still(0);
  it('rejects a trap that would cross the group', () => {
    expect(isTrapPathClear({ x: 360, vx: 0, vy: 300, y0: -80, t0Ms: 0 }, still, FIELD)).toBe(false);
  });
  it('rejects a trap that drifts sideways into the group', () => {
    expect(isTrapPathClear({ x: box.left - 400, vx: 150, vy: 300, y0: -80, t0Ms: 0 }, still, FIELD)).toBe(false);
  });
  it('accepts one that passes beside it', () => {
    expect(isTrapPathClear({ x: box.right + TRAP_HALF + TRAP_GAP + 5, vx: 0, vy: 300, y0: -80, t0Ms: 0 }, still, FIELD)).toBe(true);
  });
  it('rejects a zigzag whose sway reaches into the group', () => {
    const x = box.right + TRAP_HALF + TRAP_GAP + 5;
    expect(isTrapPathClear({ x, vx: 0, vy: 300, y0: -80, t0Ms: 0, zigzag: { amp: 80, periodMs: 1800 } }, still, FIELD)).toBe(false);
  });
});

describe('trap spawning simulation', () => {
  const dt = 50;
  const groupY = (t) => 60 + 0.045 * t * 1; // px; slow drift (45 px/s), no wrap within a trap's flight
  const boxAt = t => groupBox(groupSwayX(t, SW), groupY(t % 20000), SPRITES, GROUP_H);

  function candidates(n) {
    const rng = seededRng(12345);
    const out = [];
    let t = 0;
    while (out.length < n) {
      const { id, side } = pickFormation({ diffKey: 'hard', aimAllowed: false, rng });
      const slots = buildFormation({ id, side, count: 4, minX: 60, maxX: 660, rng });
      for (const s of slots) {
        out.push({ ...s, t: t + s.delayMs, vy: speedFor('hazard', 'hard', Math.floor(rng() * 4), rng) });
      }
      t += 2400 + rng() * 9000;
    }
    return out.slice(0, n);
  }
  const accepted = candidates(2000).filter(c =>
    isTrapPathClear({ x: c.x, vx: c.vx, vy: c.vy, y0: -80, t0Ms: c.t, zigzag: c.zigzag }, boxAt, FIELD));

  it('accepts a healthy share of candidates', () => {
    expect(accepted.length).toBeGreaterThanOrEqual(0.15 * 2000);
  });
  it('no accepted trap ever overlaps the group', () => {
    for (const c of accepted) {
      for (let k = 0; ; k += 10) {
        const y = -80 + c.vy * k / 1000;
        if (y - TRAP_HALF > 1280) break;
        const x = c.x + c.vx * k / 1000 + (c.zigzag ? c.zigzag.amp * Math.sin(2 * Math.PI * k / c.zigzag.periodMs) : 0);
        const b = boxAt(c.t + k);
        const hit = x + TRAP_HALF > b.left && x - TRAP_HALF < b.right && y + TRAP_HALF > b.top && y - TRAP_HALF < b.bottom;
        expect(hit).toBe(false);
      }
    }
  });
  it('traps come from both sides', () => {
    const left = accepted.filter(c => c.x < 360).length / accepted.length;
    const right = accepted.filter(c => c.x > 360).length / accepted.length;
    expect(left).toBeGreaterThanOrEqual(0.2);
    expect(right).toBeGreaterThanOrEqual(0.2);
  });
});

describe('shipped trap size and geometry', () => {
  it('trap is at least as large as Betelgeuse drawn, group stays >= 220 px per unit', () => {
    expect(TRAP_SCALE.min).toBeGreaterThanOrEqual(NAMED_STARS.betelgeuse.size * STAR_PX - 1e-9);
    expect(GROUP_SCALE).toBeGreaterThanOrEqual(220);
    expect(TRAP_GAP).toBeGreaterThanOrEqual(20);
    expect(M3_SWAY.periodMs).toBeLessThanOrEqual(12000);
  });
});

describe('trapKeepsEscapeGap', () => {
  it('thins a dense candidate row so a gap for the ship always remains', () => {
    const opts = { trapHalf: TRAP_HALF, shipWidth: 64, screenW: 720 };
    const row = [];
    for (let x = 60; x <= 660; x += 40) row.push({ delayMs: 1000, x, zigzag: null });
    const kept = [];
    for (const c of row) if (trapKeepsEscapeGap(kept, c, opts)) kept.push(c);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(row.length);
    expect(escapeGapOk(kept, { shipWidth: 64, minX: 0, maxX: 720, objectWidth: 2 * TRAP_HALF })).toBe(true);
  });
});
