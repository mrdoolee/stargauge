import { describe, it, expect } from 'vitest';
import {
  STAR_COLORS, SUN_KEY, colorByKey, FURNACE_STAGES, isHotter,
  hotterThanSun, coolerThanSun, sortHottestFirst,
} from '../../src/logic/temperature.js';
import { heatOnCollision } from '../../src/logic/heat.js';

describe('temperature', () => {
  it('STAR_COLORS labels and ranks', () => {
    expect(STAR_COLORS.map(c => c.label)).toEqual(['청색','청백색','백색','황백색','황색','주황색','적색']);
    expect(STAR_COLORS.map(c => c.rank)).toEqual([0,1,2,3,4,5,6]);
    expect(SUN_KEY).toBe('yellow');
    expect(colorByKey('red').hex).toBe(0xff4b3a);
    expect(() => colorByKey('nope')).toThrow();
  });
  it('FURNACE_STAGES order', () => {
    expect(FURNACE_STAGES.map(s => s.key)).toEqual(['white','yellow','orange','red']);
    expect(FURNACE_STAGES.map(s => s.label)).toEqual(['흰색','노란색','주황색','붉은색']);
  });
  it('isHotter', () => {
    expect(isHotter('blue','red')).toBe(true);
    expect(isHotter('red','yellow')).toBe(false);
    expect(isHotter('yellow','yellow')).toBe(false);
  });
  it('sun comparisons', () => {
    const keys = STAR_COLORS.map(c => c.key);
    expect(keys.filter(hotterThanSun)).toEqual(['blue','blueWhite','white','yellowWhite']);
    expect(keys.filter(coolerThanSun)).toEqual(['orange','red']);
    expect(hotterThanSun('yellow')).toBe(false);
    expect(coolerThanSun('yellow')).toBe(false);
  });
  it('sortHottestFirst', () => {
    const items = [{colorKey:'red'},{colorKey:'blue'},{colorKey:'yellow'}];
    expect(sortHottestFirst(items).map(i => i.colorKey)).toEqual(['blue','yellow','red']);
    expect(sortHottestFirst([{k:'red'},{k:'blue'}], i => i.k).map(i => i.k)).toEqual(['blue','red']);
    expect(items[0].colorKey).toBe('red'); // not mutated
  });
});

describe('heatOnCollision', () => {
  it('star heat strictly decreases with rank', () => {
    const v = STAR_COLORS.map(c => heatOnCollision('star', c.key));
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeLessThan(v[i-1]);
  });
  it('depends only on kind and key', () => {
    expect(heatOnCollision.length).toBeLessThanOrEqual(2);
    expect(heatOnCollision('star','blue')).toBe(heatOnCollision('star','blue'));
  });
  it('furnace and asteroid', () => {
    expect(heatOnCollision('furnace','white')).toBeGreaterThan(heatOnCollision('furnace','red'));
    expect(heatOnCollision('asteroid')).toBe(15);
  });
  it('throws on unknown', () => {
    expect(() => heatOnCollision('ufo','red')).toThrow();
    expect(() => heatOnCollision('star','pink')).toThrow();
    expect(() => heatOnCollision('furnace','blue')).toThrow();
  });
});
