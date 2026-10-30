import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ROTATE_QUERY, ROTATE_CLASS, applyOrientation } from '../../src/config/orientation.js';

function fakeRoot() {
  const set = new Set();
  return { classList: { toggle: (c, on) => (on ? set.add(c) : set.delete(c)), contains: c => set.has(c) } };
}
function fakeLoop({ started = true, running = true } = {}) {
  return {
    started, running, sleeps: 0, wakes: 0,
    sleep() { if (this.running) { this.running = false; this.sleeps++; } },
    wake() { if (!this.running) { this.running = true; this.wakes++; } },
  };
}

describe('ROTATE_QUERY', () => {
  it('triggers in any landscape on a touch device (tablets too), not by screen height', () => {
    expect(ROTATE_QUERY).toBe('(orientation: landscape) and (pointer: coarse)');
    expect(ROTATE_QUERY).not.toMatch(/max-height/);
  });
});

describe('index.html', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  it('shows #rotate only through the class JS toggles (no media query of its own)', () => {
    expect(html).toContain(`html.${ROTATE_CLASS} #rotate{display:flex}`);
    expect(html).not.toMatch(/@media[^{]*orientation/);
  });
});

describe('applyOrientation', () => {
  it('landscape: sets the class and sleeps a running loop', () => {
    const root = fakeRoot();
    const loop = fakeLoop();
    expect(applyOrientation(true, { root, loop })).toBe(true);
    expect(root.classList.contains(ROTATE_CLASS)).toBe(true);
    expect(loop.running).toBe(false);
  });
  it('portrait: clears the class, wakes the loop and reports the wake once', () => {
    const root = fakeRoot();
    const loop = fakeLoop({ running: false });
    let woke = 0;
    applyOrientation(true, { root, loop });
    expect(applyOrientation(false, { root, loop, onWake: () => woke++ })).toBe(false);
    expect(root.classList.contains(ROTATE_CLASS)).toBe(false);
    expect(loop.running).toBe(true);
    expect(woke).toBe(1);
    applyOrientation(false, { root, loop, onWake: () => woke++ }); // already running: no extra wake
    expect(woke).toBe(1);
  });
  it('does not touch a loop that has not started yet (only the class)', () => {
    const root = fakeRoot();
    const loop = fakeLoop({ started: false, running: false });
    applyOrientation(false, { root, loop });
    expect(loop.wakes).toBe(0);
    applyOrientation(true, { root, loop });
    expect(root.classList.contains(ROTATE_CLASS)).toBe(true);
  });
  it('works with no root or loop', () => {
    expect(() => applyOrientation(true, {})).not.toThrow();
  });
});
