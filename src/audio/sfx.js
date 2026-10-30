// Synthesized sound effects (WebAudio oscillators, no files). Classroom use: quiet by
// default, mutable, never throws when WebAudio is missing or suspended.
//
//   sfx.play('correct'|'wrong'|'hit'|'fire'|'clear'|'mark')   sfx.setMuted(bool)   sfx.muted
//   sfx.installUnlock(window)  // creates/resumes the single AudioContext on the first gesture
//
// Bus graph:  osc -> note gain -> (sfx | ui bus) -> master -> destination.
// (No music bus: this game has no music.)

/** Linear bus gains. Master is low so a full classroom is not loud. */
export const GAINS = { master: 0.25, sfx: 0.8, ui: 0.9 };

/** Pitch spread per play: ±5%. */
export const PITCH_SPREAD = 0.05;

/** Min ms between two 'fire' sounds (rapid taps still fire; only the sound is limited). */
export const FIRE_MIN_GAP_MS = 40;

export const SFX_NAMES = ['correct', 'wrong', 'hit', 'fire', 'clear', 'mark'];

/**
 * Envelope tables. Note: { type, f0, f1 (end freq, optional), at (s offset), dur (s),
 * gain (0..1), attack (s) }. Decay is exponential to ~silence over `dur`.
 */
export const SFX_DEFS = {
  fire: { bus: 'sfx', notes: [{ type: 'square', f0: 880, f1: 440, at: 0, dur: 0.07, gain: 0.25, attack: 0.004 }] },
  correct: {
    bus: 'sfx',
    notes: [
      { type: 'sine', f0: 660, at: 0, dur: 0.14, gain: 0.5, attack: 0.005 },
      { type: 'sine', f0: 990, at: 0.07, dur: 0.22, gain: 0.5, attack: 0.005 },
    ],
  },
  // Neutral acknowledgement (m1 practice hit on an already-cooled blob): soft, low, not a reward.
  mark: { bus: 'sfx', notes: [{ type: 'sine', f0: 392, at: 0, dur: 0.1, gain: 0.25, attack: 0.006 }] },
  wrong: { bus: 'sfx', notes: [{ type: 'triangle', f0: 220, f1: 150, at: 0, dur: 0.22, gain: 0.5, attack: 0.008 }] },
  hit: {
    bus: 'sfx',
    notes: [
      { type: 'sawtooth', f0: 140, f1: 55, at: 0, dur: 0.18, gain: 0.55, attack: 0.004 },
      { type: 'square', f0: 90, f1: 45, at: 0, dur: 0.12, gain: 0.3, attack: 0.004 },
    ],
  },
  clear: {
    bus: 'ui',
    notes: [
      { type: 'sine', f0: 523, at: 0, dur: 0.18, gain: 0.5, attack: 0.01 },
      { type: 'sine', f0: 659, at: 0.12, dur: 0.18, gain: 0.5, attack: 0.01 },
      { type: 'sine', f0: 784, at: 0.24, dur: 0.18, gain: 0.5, attack: 0.01 },
      { type: 'sine', f0: 1047, at: 0.36, dur: 0.34, gain: 0.5, attack: 0.01 },
    ],
  },
};

/** Multiplier in [1-spread, 1+spread] from a 0..1 random source. */
export function pitchVariation(rng = Math.random, spread = PITCH_SPREAD) {
  return 1 - spread + rng() * 2 * spread;
}

/** Returns allow(nowMs) -> true if at least minMs passed since the last allowed call. */
export function createRateLimiter(minMs) {
  let last = -Infinity;
  return now => {
    if (now - last < minMs) return false;
    last = now;
    return true;
  };
}

const defaultContextClass = () =>
  typeof globalThis !== 'undefined' ? globalThis.AudioContext || globalThis.webkitAudioContext || null : null;

export class Sfx {
  constructor({ getContextClass = defaultContextClass, now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), rng = Math.random } = {}) {
    this.getContextClass = getContextClass;
    this.now = now;
    this.rng = rng;
    this.ctx = null;
    this.buses = null;
    this._muted = false;
    this._failed = false;
    this._fireOk = createRateLimiter(FIRE_MIN_GAP_MS);
  }

  get muted() { return this._muted; }

  setMuted(v) {
    this._muted = !!v;
    if (this.buses) this.buses.master.gain.value = this._muted ? 0 : GAINS.master;
  }

  /** Create (once) / resume the AudioContext. Safe to call any time; never throws. */
  unlock() {
    try {
      if (!this.ctx && !this._failed) {
        const Ctx = this.getContextClass();
        if (!Ctx) { this._failed = true; return; }
        const ctx = new Ctx();
        const master = ctx.createGain();
        master.gain.value = this._muted ? 0 : GAINS.master;
        master.connect(ctx.destination);
        const sfx = ctx.createGain();
        sfx.gain.value = GAINS.sfx;
        sfx.connect(master);
        const ui = ctx.createGain();
        ui.gain.value = GAINS.ui;
        ui.connect(master);
        this.ctx = ctx;
        this.buses = { master, sfx, ui };
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume?.()?.catch?.(() => {});
    } catch {
      this._failed = true;
      this.ctx = null;
      this.buses = null;
    }
  }

  /** Attach one-shot-ish gesture listeners that unlock audio. */
  installUnlock(target) {
    if (!target?.addEventListener) return;
    const go = () => this.unlock();
    for (const ev of ['pointerdown', 'touchend', 'keydown']) target.addEventListener(ev, go, { passive: true });
  }

  play(name) {
    const def = SFX_DEFS[name];
    if (!def || this._muted) return;
    if (name === 'fire' && !this._fireOk(this.now())) return;
    this.unlock(); // no-op once created; makes a late first play still work
    const ctx = this.ctx;
    if (!ctx || ctx.state === 'suspended') return;
    try {
      const bus = this.buses[def.bus];
      const pitch = pitchVariation(this.rng);
      const t0 = ctx.currentTime;
      for (const n of def.notes) {
        const start = t0 + n.at;
        const end = start + n.dur;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = n.type;
        osc.frequency.setValueAtTime(n.f0 * pitch, start);
        if (n.f1) osc.frequency.exponentialRampToValueAtTime(n.f1 * pitch, end);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(n.gain, start + n.attack);
        g.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(g);
        g.connect(bus);
        osc.start(start);
        osc.stop(end + 0.02);
      }
    } catch {
      /* audio must never break gameplay */
    }
  }
}

export const sfx = new Sfx();
