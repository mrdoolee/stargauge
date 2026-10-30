// Debug helpers (pure, no Phaser import). Everything here is inert unless the URL has ?debug=1.
import { ALL_COLOR_KEYS } from '../logic/flow.js';

export const DEBUG_MISSIONS = ['m1', 'm2', 'm3', 'm4', 'report'];

/** Parse location.search. `mission` is honoured only together with debug=1 and only for known scene keys. */
export function parseDebug(search) {
  const off = { debug: false, mission: null };
  if (typeof search !== 'string' || !search) return off;
  const p = new URLSearchParams(search);
  if (p.get('debug') !== '1') return off;
  const m = p.get('mission');
  return { debug: true, mission: DEBUG_MISSIONS.includes(m) ? m : null };
}

/** Registry values earlier missions would have written, so a jump straight to m3/m4/report/result works. */
export function debugRegistryDefaults() {
  return { results: {}, gaugeFinal: [...ALL_COLOR_KEYS], orionTagged: [] };
}

/** Rolling FPS statistics. frame(dtMs, nowMs) per frame; no allocation once the ring is full. */
export class FpsTracker {
  constructor({ windowMs = 10000, ignoreAboveMs = 1000 } = {}) {
    this.windowMs = windowMs;
    this.ignoreAboveMs = ignoreAboveMs;
    this.samples = []; // [{ t, fps }] within the window (about 600 entries at 60 fps)
    this.fps = 0;
    this.overallMin = Infinity;
  }

  reset() {
    this.samples.length = 0;
    this.fps = 0;
    this.overallMin = Infinity;
  }

  frame(dtMs, nowMs) {
    if (!(dtMs > 0) || dtMs > this.ignoreAboveMs) return; // app switch / sleep gap, not a real frame
    const fps = 1000 / dtMs;
    this.fps = fps;
    if (fps < this.overallMin) this.overallMin = fps;
    this.samples.push({ t: nowMs, fps });
    this.trim(nowMs);
  }

  trim(nowMs) {
    let n = 0;
    while (n < this.samples.length && nowMs - this.samples[n].t > this.windowMs) n++;
    if (n) this.samples.splice(0, n);
  }

  windowMin(nowMs) {
    this.trim(nowMs);
    let min = Infinity;
    for (const s of this.samples) if (s.fps < min) min = s.fps;
    return min;
  }
}
