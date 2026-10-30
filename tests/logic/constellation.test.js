import { describe, it, expect } from 'vitest';
import { toScreen, advanceGroup, fitLayout } from '../../src/logic/constellation.js';
import { CONSTELLATION_POS, ORION_BACKGROUND } from '../../src/data/stars.js';

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
  groupSprites, trapLane, SPRITE_HALF, TRAP_SCALE, TRAP_GAP,
} from '../../src/logic/constellation.js';

describe('trap lane vs group', () => {
  const sprites = groupSprites();
  const lane = trapLane(sprites, { screenW: 720 });
  it('has a usable lane', () => {
    expect(lane.max).toBeGreaterThanOrEqual(lane.min);
  });
  it('keeps trap sprites >= gap clear of every constellation sprite', () => {
    for (const x of [lane.min, lane.max]) {
      for (const sc of [TRAP_SCALE.min, TRAP_SCALE.max]) {
        const left = x - SPRITE_HALF * sc;
        for (const s of sprites) expect(left - (s.x + s.half)).toBeGreaterThanOrEqual(TRAP_GAP);
      }
    }
  });
  it('keeps traps and all group sprites fully on screen', () => {
    expect(lane.max + SPRITE_HALF * TRAP_SCALE.max).toBeLessThanOrEqual(720);
    for (const s of sprites) {
      expect(s.x - s.half).toBeGreaterThanOrEqual(0);
      expect(s.x + s.half).toBeLessThanOrEqual(720);
    }
  });
});
