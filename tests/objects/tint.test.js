import { describe, it, expect } from 'vitest';
import { tintPixels, stretchLuminance, snapWhite } from '../../src/objects/tint.js';
import { STAR_COLORS, FURNACE_STAGES } from '../../src/logic/temperature.js';

const ch = hex => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

describe('tintPixels', () => {
  it.each([...STAR_COLORS, ...FURNACE_STAGES].map(c => [c.key, c.hex]))('white pixel x %s = exactly that color, alpha kept', (_k, hex) => {
    const out = tintPixels(new Uint8ClampedArray([255, 255, 255, 200, 255, 255, 255, 7]), hex);
    expect([...out.slice(0, 3)]).toEqual(ch(hex));
    expect(out[3]).toBe(200);
    expect([...out.slice(4, 7)]).toEqual(ch(hex));
    expect(out[7]).toBe(7);
  });
  it('black stays black; gray scales', () => {
    const out = tintPixels(new Uint8ClampedArray([0, 0, 0, 255, 128, 128, 128, 255]), 0xff8000);
    expect([...out.slice(0, 4)]).toEqual([0, 0, 0, 255]);
    expect([...out.slice(4, 8)]).toEqual([128, 64, 0, 255]);
  });
  it('returns a new array and leaves the input alone', () => {
    const src = new Uint8ClampedArray([255, 255, 255, 255]);
    const out = tintPixels(src, 0x123456);
    expect(out).not.toBe(src);
    expect([...src]).toEqual([255, 255, 255, 255]);
  });
});

describe('stretchLuminance', () => {
  it('maps the given percentile of opaque pixels to 255, clamps, keeps alpha, new array', () => {
    const px = [];
    for (let i = 0; i < 10; i++) px.push(100 + i * 5, 100 + i * 5, 100 + i * 5, 255);
    px.push(250, 250, 250, 0); // transparent: ignored
    const src = new Uint8ClampedArray(px);
    const out = stretchLuminance(src, 0.9);
    expect(out).not.toBe(src);
    expect(Math.max(...[...out].filter((_, i) => i % 4 === 0).slice(0, 10))).toBe(255);
    expect(out[3]).toBe(255);
    expect(out[43]).toBe(0);
    expect(src[0]).toBe(100);
  });
  it('all-black input is returned unchanged', () => {
    expect([...stretchLuminance(new Uint8ClampedArray([0, 0, 0, 255]), 0.9)]).toEqual([0, 0, 0, 255]);
  });
});

describe('snapWhite', () => {
  it('lifts near-white pixels (all channels >= threshold) to pure white, leaves others and alpha, new array', () => {
    const src = new Uint8ClampedArray([253, 252, 253, 200, 240, 255, 255, 255, 10, 10, 10, 255]);
    const out = snapWhite(src, 250);
    expect([...out]).toEqual([255, 255, 255, 200, 240, 255, 255, 255, 10, 10, 10, 255]);
    expect(out).not.toBe(src);
    expect(src[0]).toBe(253);
  });
});
