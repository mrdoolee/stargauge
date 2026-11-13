import { describe, it, expect } from 'vitest';
import { StarGauge } from '../../src/logic/gauge.js';
import { STAR_COLORS } from '../../src/logic/temperature.js';

describe('StarGauge', () => {
  it('fill returns true once, false on repeat', () => {
    const g = new StarGauge(['yellow']);
    expect(g.has('yellow')).toBe(true);
    expect(g.fill('blue')).toBe(true);
    expect(g.fill('blue')).toBe(false);
  });
  it('filledKeys in rank order', () => {
    const g = new StarGauge(['yellow']);
    g.fill('red');
    g.fill('blue');
    expect(g.filledKeys()).toEqual(['blue', 'yellow', 'red']);
  });
  it('isComplete with all 7 and with subset', () => {
    const g = new StarGauge(['yellow']);
    expect(g.isComplete()).toBe(false);
    expect(g.isComplete(['yellow'])).toBe(true);
    STAR_COLORS.forEach(c => g.fill(c.key));
    expect(g.isComplete()).toBe(true);
  });
  it('hitsPerColor 2: a color fills on its second hit; the first hit makes it partial', () => {
    const g = new StarGauge(['yellow'], 2);
    expect(g.has('yellow')).toBe(true); // prefilled cells are full
    expect(g.fill('blue')).toBe(true); // changed: 1 of 2
    expect(g.has('blue')).toBe(false);
    expect(g.partialKeys()).toEqual(['blue']);
    expect(g.fill('blue')).toBe(true); // changed: full
    expect(g.has('blue')).toBe(true);
    expect(g.partialKeys()).toEqual([]);
    expect(g.fill('blue')).toBe(false); // already full
  });
  it('remainingHits counts the hits still needed over some colors', () => {
    const g = new StarGauge(['yellow'], 2);
    expect(g.remainingHits(['blue', 'white', 'yellow'])).toBe(4);
    g.fill('blue');
    expect(g.remainingHits(['blue', 'white', 'yellow'])).toBe(3);
    const one = new StarGauge([], 1);
    expect(one.remainingHits(['blue', 'red'])).toBe(2);
    one.fill('red');
    expect(one.remainingHits(['blue', 'red'])).toBe(1);
  });
});

