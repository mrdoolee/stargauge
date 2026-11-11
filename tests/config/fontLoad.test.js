import { describe, it, expect } from 'vitest';
import { loadGameFont, FONT_LOAD_SPEC, FONT_TIMEOUT_MS } from '../../src/config/fontLoad.js';

const never = () => new Promise(() => {});

describe('loadGameFont', () => {
  it('asks the browser to load Orbit and reports true when it arrives', async () => {
    const calls = [];
    const doc = { fonts: { load: spec => { calls.push(spec); return Promise.resolve([{}]); } } };
    expect(await loadGameFont(doc)).toBe(true);
    expect(calls).toEqual([FONT_LOAD_SPEC]);
    expect(FONT_LOAD_SPEC).toContain('Orbit');
  });

  it('gives up after the timeout and never throws', async () => {
    const doc = { fonts: { load: never } };
    expect(await loadGameFont(doc, { timeoutMs: 20 })).toBe(false);
    expect(FONT_TIMEOUT_MS).toBe(3000);
  });

  it('swallows a rejected load', async () => {
    const doc = { fonts: { load: () => Promise.reject(new Error('net')) } };
    expect(await loadGameFont(doc)).toBe(false);
  });

  it('swallows a load that throws synchronously', async () => {
    const doc = { fonts: { load: () => { throw new Error('x'); } } };
    expect(await loadGameFont(doc)).toBe(false);
  });

  it('is a no-op without the Font Loading API', async () => {
    expect(await loadGameFont({})).toBe(false);
    expect(await loadGameFont(undefined)).toBe(false);
  });

  it('reports false when the browser found no matching face', async () => {
    const doc = { fonts: { load: () => Promise.resolve([]) } };
    expect(await loadGameFont(doc)).toBe(false);
  });
});
