import { describe, it, expect } from 'vitest';
import { parseDebug, debugRegistryDefaults, FpsTracker } from '../../src/config/debug.js';
import { ALL_COLOR_KEYS } from '../../src/logic/flow.js';

describe('parseDebug', () => {
  it('is off without the flag', () => {
    expect(parseDebug('')).toEqual({ debug: false, mission: null, difficulty: null });
    expect(parseDebug('?mission=m4')).toEqual({ debug: false, mission: null, difficulty: null }); // shortcut needs debug=1
    expect(parseDebug('?debug=0')).toEqual({ debug: false, mission: null, difficulty: null });
    expect(parseDebug('?debug=true')).toEqual({ debug: false, mission: null, difficulty: null });
  });
  it('debug=1 turns the overlay on', () => {
    expect(parseDebug('?debug=1')).toEqual({ debug: true, mission: null, difficulty: null });
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
    expect(parseDebug(undefined)).toEqual({ debug: false, mission: null, difficulty: null });
    expect(parseDebug(null)).toEqual({ debug: false, mission: null, difficulty: null });
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

describe('FpsTracker settle window (no false lows after a reset / wake)', () => {
  it('ignores samples for settleMs after reset(now)', () => {
    const t = new FpsTracker({ settleMs: 500 });
    t.reset(1000);
    t.frame(400, 1100); // scene build frame right after mission start: 2.5 fps, must not count
    t.frame(100, 1499);
    expect(t.overallMin).toBe(Infinity);
    expect(t.windowMin(1499)).toBe(Infinity);
    t.frame(1000 / 60, 1500 + 1000 / 60);
    expect(t.overallMin).toBeCloseTo(60, 0);
  });
  it('settle(now) keeps the stats but ignores the next settleMs (wake / visible)', () => {
    const t = new FpsTracker({ settleMs: 500 });
    t.frame(1000 / 30, 100); // 30 fps
    t.settle(200);
    t.frame(900, 300); // loop woke after an 0.9 s sleep: not a real frame
    expect(t.overallMin).toBeCloseTo(30, 0);
    expect(t.windowMin(300)).toBeCloseTo(30, 0);
  });
  it('reset() without a time clears without a settle window', () => {
    const t = new FpsTracker({ settleMs: 500 });
    t.reset();
    t.frame(100, 10);
    expect(t.overallMin).toBeCloseTo(10, 0);
  });
});

describe('FpsTracker ring buffer', () => {
  it('uses preallocated storage that never grows', () => {
    const t = new FpsTracker({ windowMs: 10000, capacity: 64 });
    const before = t.times;
    let now = 0;
    for (let i = 0; i < 1000; i++) { now += 1000 / 60; t.frame(1000 / 60, now); }
    expect(t.times).toBe(before);
    expect(t.times.length).toBe(64);
  });
  it('window min stays correct after the ring wraps (oldest samples dropped)', () => {
    const t = new FpsTracker({ windowMs: 100000, capacity: 8 });
    t.frame(100, 10); // 10 fps — will be overwritten by the wrap
    let now = 10;
    for (let i = 0; i < 8; i++) { now += 20; t.frame(20, now); } // 50 fps
    expect(t.windowMin(now)).toBeCloseTo(50, 0);
    expect(t.overallMin).toBeCloseTo(10, 0);
  });
  it('default capacity holds a 10 s window at 120 Hz', () => {
    const t = new FpsTracker();
    expect(t.times.length).toBeGreaterThanOrEqual(1200);
  });
});

describe('parseDebug difficulty', () => {
  it('accepts easy/normal/hard with debug=1 only', () => {
    for (const d of ['easy', 'normal', 'hard']) {
      expect(parseDebug(`?debug=1&mission=m2&difficulty=${d}`).difficulty).toBe(d);
    }
    expect(parseDebug('?difficulty=hard').difficulty).toBeNull();
    expect(parseDebug('?debug=1&difficulty=extreme').difficulty).toBeNull();
    expect(parseDebug('?debug=1').difficulty).toBeNull();
    expect(parseDebug('').difficulty).toBeNull();
  });
});
