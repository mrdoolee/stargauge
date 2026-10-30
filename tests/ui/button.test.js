import { describe, it, expect } from 'vitest';
import { createPressGate, armButton, BUTTON_ARM_MS } from '../../src/ui/button.js';

describe('createPressGate', () => {
  const t0 = 1000;
  const gate = (now = t0) => createPressGate({ now: () => now, armMs: 300 });

  it('activates on up only when the same pointer pressed down on it (same press)', () => {
    const g = gate();
    g.down({ id: 1, downTime: t0 + 400 }, t0 + 400);
    expect(g.up({ id: 1, downTime: t0 + 400 }, t0 + 500)).toBe(true);
  });

  it('ignores an up with no matching down (finger held from the previous screen)', () => {
    const g = gate();
    expect(g.up({ id: 1, downTime: t0 - 2000 }, t0 + 500)).toBe(false);
  });

  it('ignores an up from a different pointer', () => {
    const g = gate();
    g.down({ id: 1, downTime: t0 + 400 }, t0 + 400);
    expect(g.up({ id: 2, downTime: t0 + 450 }, t0 + 500)).toBe(false);
    expect(g.up({ id: 1, downTime: t0 + 400 }, t0 + 520)).toBe(true);
  });

  it('ignores a later press of a reused pointer id (stale down is not reused)', () => {
    const g = gate();
    g.down({ id: 1, downTime: t0 + 400 }, t0 + 400); // pressed, slid off, lifted elsewhere: no up here
    expect(g.up({ id: 1, downTime: t0 + 900 }, t0 + 1000)).toBe(false); // new press started elsewhere
  });

  it('ignores downs during the arm delay after the screen appears', () => {
    const g = gate();
    g.down({ id: 1, downTime: t0 + 100 }, t0 + 100);
    expect(g.up({ id: 1, downTime: t0 + 100 }, t0 + 400)).toBe(false);
    g.down({ id: 1, downTime: t0 + 300 }, t0 + 300); // exactly at the arm time: allowed
    expect(g.up({ id: 1, downTime: t0 + 300 }, t0 + 350)).toBe(true);
  });

  it('activates once per press', () => {
    const g = gate();
    g.down({ id: 1, downTime: t0 + 400 }, t0 + 400);
    expect(g.up({ id: 1, downTime: t0 + 400 }, t0 + 500)).toBe(true);
    expect(g.up({ id: 1, downTime: t0 + 400 }, t0 + 510)).toBe(false);
  });

  it('rearm() restarts the arm delay and forgets a pending press', () => {
    let now = t0;
    const g = createPressGate({ now: () => now, armMs: 300 });
    now = t0 + 400;
    g.down({ id: 1, downTime: now }, now);
    g.rearm();
    expect(g.up({ id: 1, downTime: t0 + 400 }, t0 + 450)).toBe(false);
    g.down({ id: 1, downTime: t0 + 500 }, t0 + 500); // within 300 ms of rearm
    expect(g.up({ id: 1, downTime: t0 + 500 }, t0 + 800)).toBe(false);
  });

  it('default arm delay is about 300 ms', () => {
    expect(BUTTON_ARM_MS).toBeGreaterThanOrEqual(250);
    expect(BUTTON_ARM_MS).toBeLessThanOrEqual(400);
  });
});

describe('armButton (wiring with a fake game object)', () => {
  function fakeObject() {
    const handlers = {};
    return {
      handlers,
      interactive: false,
      input: null,
      setInteractive() { this.interactive = true; this.input = {}; return this; },
      on(ev, fn) { (handlers[ev] ??= []).push(fn); return this; },
      emit(ev, ...a) { for (const fn of handlers[ev] ?? []) fn(...a); },
    };
  }

  it('makes the object interactive and calls onActivate only for a full press', () => {
    let now = 0;
    const go = fakeObject();
    let n = 0;
    armButton(go, () => { n++; }, { now: () => now });
    expect(go.interactive).toBe(true);
    now = 1000;
    go.emit('pointerup', { id: 1, downTime: -50 }); // finger held from the previous screen
    expect(n).toBe(0);
    go.emit('pointerdown', { id: 1, downTime: 1000 });
    now = 1100;
    go.emit('pointerup', { id: 1, downTime: 1000 });
    expect(n).toBe(1);
  });

  it('passes the game object to onActivate and can stop propagation on down', () => {
    let now = 1000;
    const go = fakeObject();
    let got = null;
    let stopped = 0;
    armButton(go, o => { got = o; }, { now: () => now, armMs: 0, stopPropagation: true });
    go.emit('pointerdown', { id: 3, downTime: 1000 }, 0, 0, { stopPropagation() { stopped++; } });
    go.emit('pointerup', { id: 3, downTime: 1000 }, 0, 0, { stopPropagation() { stopped++; } });
    expect(got).toBe(go);
    expect(stopped).toBe(2);
  });
});
