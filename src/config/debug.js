// Debug helpers (pure, no Phaser import). Everything here is inert unless the URL has ?debug=1.
import { ALL_COLOR_KEYS } from '../logic/flow.js';

export const DEBUG_MISSIONS = ['m1', 'm2', 'm3', 'm4', 'report', 'ending'];

/** Parse location.search. `mission` is honoured only together with debug=1 and only for known scene keys. */
export function parseDebug(search) {
  const off = { debug: false, mission: null, difficulty: null };
  if (typeof search !== 'string' || !search) return off;
  const p = new URLSearchParams(search);
  if (p.get('debug') !== '1') return off;
  const m = p.get('mission');
  const d = p.get('difficulty');
  return {
    debug: true,
    mission: DEBUG_MISSIONS.includes(m) ? m : null,
    difficulty: ['easy', 'normal', 'hard'].includes(d) ? d : null,
  };
}

/** Registry values earlier missions would have written, so a jump straight to m3/m4/report/result works. */
export function debugRegistryDefaults() {
  return { results: {}, gaugeFinal: [...ALL_COLOR_KEYS] };
}

/**
 * Rolling FPS statistics. frame(dtMs, nowMs) per frame. Samples live in a preallocated ring
 * (two Float64Arrays), so recording never allocates; when the ring is full the oldest sample is
 * overwritten (capacity 2048 covers a 10 s window at up to ~200 fps).
 * After reset(now) or settle(now) the next settleMs are ignored: the first frames after a mission
 * start (scene build), a loop wake or a tab return are not real gameplay frames.
 */
export class FpsTracker {
  constructor({ windowMs = 10000, ignoreAboveMs = 1000, settleMs = 500, capacity = 2048 } = {}) {
    this.windowMs = windowMs;
    this.ignoreAboveMs = ignoreAboveMs;
    this.settleMs = settleMs;
    this.times = new Float64Array(capacity);
    this.values = new Float64Array(capacity);
    this.head = 0; // index of the oldest sample
    this.count = 0;
    this.ignoreUntil = -Infinity;
    this.fps = 0;
    this.overallMin = Infinity;
  }

  /** Clear everything. With a time, also ignore the next settleMs (e.g. a new mission starts). */
  reset(nowMs) {
    this.head = 0;
    this.count = 0;
    this.fps = 0;
    this.overallMin = Infinity;
    this.ignoreUntil = -Infinity;
    if (typeof nowMs === 'number') this.settle(nowMs);
  }

  /** Keep the stats but ignore samples until nowMs + settleMs (loop wake, tab visible/focus). */
  settle(nowMs) {
    this.ignoreUntil = nowMs + this.settleMs;
  }

  frame(dtMs, nowMs) {
    if (!(dtMs > 0) || dtMs > this.ignoreAboveMs) return; // app switch / sleep gap, not a real frame
    if (nowMs < this.ignoreUntil) return; // settling after a reset / wake
    const fps = 1000 / dtMs;
    this.fps = fps;
    if (fps < this.overallMin) this.overallMin = fps;
    const cap = this.times.length;
    if (this.count === cap) {
      this.head = (this.head + 1) % cap; // full: overwrite the oldest
      this.count -= 1;
    }
    const i = (this.head + this.count) % cap;
    this.times[i] = nowMs;
    this.values[i] = fps;
    this.count += 1;
    this.trim(nowMs);
  }

  trim(nowMs) {
    const cap = this.times.length;
    while (this.count > 0 && nowMs - this.times[this.head] > this.windowMs) {
      this.head = (this.head + 1) % cap;
      this.count -= 1;
    }
  }

  windowMin(nowMs) {
    this.trim(nowMs);
    const cap = this.times.length;
    let min = Infinity;
    for (let k = 0; k < this.count; k++) {
      const v = this.values[(this.head + k) % cap];
      if (v < min) min = v;
    }
    return min;
  }
}
