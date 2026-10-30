import { describe, it, expect } from 'vitest';
import { pitchVariation, SFX_DEFS, SFX_NAMES, createRateLimiter, GAINS, Sfx } from '../../src/audio/sfx.js';

describe('pitchVariation', () => {
  it('stays within ±5%', () => {
    expect(pitchVariation(() => 0)).toBeCloseTo(0.95);
    expect(pitchVariation(() => 1)).toBeCloseTo(1.05);
    expect(pitchVariation(() => 0.5)).toBeCloseTo(1);
  });
});

describe('SFX_DEFS', () => {
  it('defines every public sound with short, valid notes', () => {
    expect(SFX_NAMES).toEqual(['correct', 'wrong', 'hit', 'fire', 'clear']);
    for (const n of SFX_NAMES) {
      const d = SFX_DEFS[n];
      expect(['sfx', 'ui']).toContain(d.bus);
      expect(d.notes.length).toBeGreaterThan(0);
      for (const note of d.notes) {
        expect(note.f0).toBeGreaterThan(0);
        expect(note.dur).toBeGreaterThan(0);
        expect(note.dur).toBeLessThanOrEqual(0.7);
        expect(note.gain).toBeGreaterThan(0);
        expect(note.gain).toBeLessThanOrEqual(1);
      }
    }
  });
  it('keeps master quiet by default', () => {
    expect(GAINS.master).toBeLessThanOrEqual(0.3);
  });
});

describe('createRateLimiter', () => {
  it('blocks calls inside the interval', () => {
    const ok = createRateLimiter(40);
    expect(ok(0)).toBe(true);
    expect(ok(39)).toBe(false);
    expect(ok(40)).toBe(true);
    expect(ok(50)).toBe(false);
  });
});

describe('Sfx without AudioContext', () => {
  it('is a no-op and never throws', () => {
    const s = new Sfx({ getContextClass: () => null });
    expect(() => { s.unlock(); for (const n of SFX_NAMES) s.play(n); s.play('nope'); }).not.toThrow();
    expect(s.ctx).toBeNull();
  });
  it('tracks muted', () => {
    const s = new Sfx({ getContextClass: () => null });
    expect(s.muted).toBe(false);
    s.setMuted(true);
    expect(s.muted).toBe(true);
    s.setMuted(false);
    expect(s.muted).toBe(false);
  });
  it('survives a throwing AudioContext constructor', () => {
    const s = new Sfx({ getContextClass: () => class { constructor() { throw new Error('x'); } } });
    expect(() => { s.unlock(); s.play('hit'); }).not.toThrow();
  });
  it('does not play while muted and creates one context only', () => {
    let made = 0;
    class Ctx {
      constructor() { made++; this.currentTime = 0; this.state = 'running'; this.destination = {}; }
      createGain() { return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} }; }
      createOscillator() { return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
      resume() { return Promise.resolve(); }
    }
    const s = new Sfx({ getContextClass: () => Ctx, now: () => 0 });
    s.unlock(); s.unlock(); s.play('hit');
    expect(made).toBe(1);
    s.setMuted(true);
    s.play('correct'); // must not throw
  });
});
