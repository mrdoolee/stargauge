import { describe, it, expect } from 'vitest';
import { colorCounts, swayOffset, clusterPosition, unmarkedMisses, formatTime } from '../../src/logic/jewelbox.js';
import { JEWELBOX } from '../../src/data/stars.js';

describe('colorCounts', () => {
  it('counts the real cluster composition in temperature order', () => {
    const c = colorCounts(JEWELBOX);
    expect(c.map(x => [x.key, x.count])).toEqual([['blue', 4], ['blueWhite', 5], ['white', 2], ['red', 1]]);
    expect(c.reduce((n, x) => n + x.count, 0)).toBe(12);
    expect(c[0].label).toBe('청색');
    expect(c[0].hex).toBeTypeOf('number');
  });
  it('skips colors with no stars', () => {
    expect(colorCounts([])).toEqual([]);
  });
});

describe('swayOffset', () => {
  it('is 0 at t=0 and peaks at the amplitude a quarter period in', () => {
    expect(swayOffset(0, 20, 4000)).toBeCloseTo(0);
    expect(swayOffset(1000, 20, 4000)).toBeCloseTo(20);
    expect(swayOffset(3000, 20, 4000)).toBeCloseTo(-20);
  });
  it('phase shifts the wave', () => {
    expect(swayOffset(0, 20, 4000, Math.PI / 2)).toBeCloseTo(20);
  });
});

describe('clusterPosition', () => {
  it('maps normalized coords into the area', () => {
    expect(clusterPosition({ x: 0, y: 0 }, { x: 80, y: 440, w: 560, h: 340 })).toEqual({ x: 80, y: 440 });
    expect(clusterPosition({ x: 1, y: 0.5 }, { x: 80, y: 440, w: 560, h: 340 })).toEqual({ x: 640, y: 610 });
  });
});

describe('unmarkedMisses', () => {
  it('counts each unmarked star at timeout as one wrong shot', () => {
    const stars = [{ marked: true }, { marked: false }, { marked: false }];
    expect(unmarkedMisses(stars)).toBe(2);
    expect(unmarkedMisses([])).toBe(0);
  });
});

describe('formatTime', () => {
  it('formats m:ss and clamps at 0', () => {
    expect(formatTime(150)).toBe('2:30');
    expect(formatTime(61.2)).toBe('1:02');
    expect(formatTime(-3)).toBe('0:00');
  });
});
