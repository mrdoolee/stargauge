import { describe, it, expect } from 'vitest';
import { HeatMeter } from '../../src/logic/heat.js';
import { MAX_DT_MS } from '../../src/config/balance.js';

describe('HeatMeter', () => {
  it('clamps at max and reports full', () => {
    const m = new HeatMeter(); m.add(120);
    expect(m.value).toBe(100); expect(m.isFull()).toBe(true); expect(m.ratio).toBe(1);
  });
  it('cools over time', () => {
    const m = new HeatMeter(); m.add(100);
    for (let i = 0; i < 10; i++) m.update(100); // 1s in MAX_DT-sized frames
    expect(m.value).toBeCloseTo(96);
  });
  it('clamps dt to MAX_DT_MS', () => {
    const m = new HeatMeter(); m.add(100); m.update(5000);
    expect(MAX_DT_MS).toBe(100);
    expect(m.value).toBeCloseTo(99.6);
  });
  it('never below 0', () => {
    const m = new HeatMeter(); m.update(1000);
    expect(m.value).toBe(0);
  });
  it('reset', () => {
    const m = new HeatMeter(); m.add(50); m.reset();
    expect(m.value).toBe(0);
  });
});
