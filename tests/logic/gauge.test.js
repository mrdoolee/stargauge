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
});
