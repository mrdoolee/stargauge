import { describe, it, expect } from 'vitest';
import { MISSION_TEXT, wrongShotMessage } from '../../src/data/copy.js';

describe('copy', () => {
  it('mission text', () => {
    ['m1', 'm2a', 'm2b', 'm3', 'm4'].forEach(id => expect(MISSION_TEXT[id].instruction).toBeTruthy());
    expect(MISSION_TEXT.m1.card).toBe('뜨거울수록 흰색, 식을수록 붉은색. 별도 그래요!');
    expect(MISSION_TEXT.m3a).toBeUndefined();
    expect(MISSION_TEXT.m3b).toBeUndefined();
  });
  it('wrong shot messages keep the tail and carry no numbers', () => {
    ['m1', 'm2a', 'm2b', 'm3', 'm4'].forEach(p => {
      ['blue', 'blueWhite', 'white', 'yellowWhite', 'yellow', 'orange', 'red'].forEach(k => {
        const m = wrongShotMessage(p, { colorKey: k });
        expect(m.endsWith('온도는 색으로 비교해요.')).toBe(true);
        expect(m).not.toMatch(/\d|켈빈/);
      });
    });
    expect(wrongShotMessage('m3', { colorKey: 'red' })).toContain('적색');
  });
});
