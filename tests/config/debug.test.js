import { describe, it, expect } from 'vitest';
import { parseDebug, debugRegistryDefaults, FpsTracker } from '../../src/config/debug.js';
import { ALL_COLOR_KEYS } from '../../src/logic/flow.js';

describe('parseDebug', () => {
  it('is off without the flag', () => {
    expect(parseDebug('')).toEqual({ debug: false, mission: null });
    expect(parseDebug('?mission=m4')).toEqual({ debug: false, mission: null }); // shortcut needs debug=1
    expect(parseDebug('?debug=0')).toEqual({ debug: false, mission: null });
    expect(parseDebug('?debug=true')).toEqual({ debug: false, mission: null });
  });
  it('debug=1 turns the overlay on', () => {
    expect(parseDebug('?debug=1')).toEqual({ debug: true, mission: null });
  });
  it('accepts known mission keys only (with debug=1)', () => {
    for (const m of ['m1', 'm2', 'm3', 'm4', 'report']) {
      expect(parseDebug(`?debug=1&mission=${m}`).mission).toBe(m);
    }
    expect(parseDebug('?mission=m4&debug=1').mission).toBe('m4');
    expect(parseDebug('?debug=1&mission=m9').mission).toBeNull();
    expect(parseDebug('?debug=1&mission=hud').mission).toBeNull();
    expect(parseDebug('?debug=1&mission=').mission).toBeNull();
  });
  it('tolerates junk input', () => {
    expect(parseDebug(undefined)).toEqual({ debug: false, mission: null });
    expect(parseDebug(null)).toEqual({ debug: false, mission: null });
  });
});

describe('debugRegistryDefaults', () => {
  it('provides what later scenes read', () => {
    const d = debugRegistryDefaults();
    expect(d.gaugeFinal).toEqual(ALL_COLOR_KEYS);
    expect(d.orionTagged).toEqual([]);
    expect(d.results).toEqual({});
  });
});

describe('FpsTracker', () => {
  it('tracks current, window min and overall min', () => {
    const t = new FpsTracker({ windowMs: 10000 });
    // 20 frames of 16.67 ms then one 50 ms frame
    let now = 0;
    for (let i = 0; i < 20; i++) { now += 1000 / 60; t.frame(1000 / 60, now); }
    now += 50; t.frame(50, now);
    expect(t.windowMin(now)).toBeCloseTo(20, 0);
    expect(t.overallMin).toBeCloseTo(20, 0);
  });
  it('forgets old minimums after the window but keeps the overall min', () => {
    const t = new FpsTracker({ windowMs: 10000 });
    t.frame(100, 1000); // 10 fps
    for (let now = 2000; now <= 20000; now += 1000) t.frame(1000 / 60, now);
    expect(t.overallMin).toBeCloseTo(10, 0);
    expect(t.windowMin(20000)).toBeGreaterThan(55);
  });
  it('ignores huge gaps (app switch) so they do not read as 0 fps', () => {
    const t = new FpsTracker({ windowMs: 10000, ignoreAboveMs: 500 });
    t.frame(5000, 6000);
    expect(t.overallMin).toBe(Infinity);
    expect(t.windowMin(6000)).toBe(Infinity);
  });
  it('reset clears the overall min', () => {
    const t = new FpsTracker();
    t.frame(100, 1000);
    t.reset();
    expect(t.overallMin).toBe(Infinity);
  });
});
