import { describe, it, expect } from 'vitest';
import { NAMED_STARS, ORION_BACKGROUND, JEWELBOX, JEWELBOX_NOTE } from '../../src/data/stars.js';
import { sortHottestFirst } from '../../src/logic/temperature.js';
import { colorByKey } from '../../src/logic/temperature.js';
import { MISSION_TEXT, wrongShotMessage } from '../../src/data/copy.js';

const named = Object.values(NAMED_STARS);

describe('named stars', () => {
  it('hottest first = rigel, sirius, betelgeuse', () => {
    expect(sortHottestFirst(named).map(s => s.id)).toEqual(['rigel', 'sirius', 'betelgeuse']);
  });
  it('trap structure', () => {
    const maxSize = Math.max(...named.map(s => s.size));
    const maxGlow = Math.max(...named.map(s => s.glow));
    expect(NAMED_STARS.betelgeuse.size).toBe(maxSize);
    expect(NAMED_STARS.sirius.glow).toBe(maxGlow);
    expect(named.filter(s => s.size === maxSize)).toHaveLength(1);
    expect(named.filter(s => s.glow === maxGlow)).toHaveLength(1);
  });
});

describe('orion background', () => {
  it('none targetable', () => {
    expect(ORION_BACKGROUND.length).toBeGreaterThan(0);
    expect(ORION_BACKGROUND.every(s => s.targetable === false)).toBe(true);
  });
});

describe('jewelbox', () => {
  it('composition', () => {
    expect(JEWELBOX).toHaveLength(12);
    const c = {};
    JEWELBOX.forEach(s => { c[s.colorKey] = (c[s.colorKey] || 0) + 1; });
    expect(c).toEqual({ blue: 4, blueWhite: 5, white: 2, red: 1 });
    expect(c.blue + c.blueWhite).toBe(9);
    const sg = JEWELBOX.find(s => s.isSupergiant);
    expect(sg.colorKey).toBe('red');
    expect(sg.size).toBe(Math.max(...JEWELBOX.map(s => s.size)));
    expect(JEWELBOX.filter(s => s.size === sg.size)).toHaveLength(1);
    expect(colorByKey(sg.colorKey).rank).toBe(Math.max(...JEWELBOX.map(s => colorByKey(s.colorKey).rank)));
    JEWELBOX.forEach(s => {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(1);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(1);
    });
    expect(new Set(JEWELBOX.map(s => s.id)).size).toBe(12);
    expect(JEWELBOX_NOTE).toBe('실제 성단을 바탕으로 단순화했어요');
  });
});

describe('copy', () => {
  it('mission text', () => {
    ['m1', 'm2a', 'm2b', 'm3a', 'm3b', 'm4'].forEach(id => expect(MISSION_TEXT[id].instruction).toBeTruthy());
    expect(MISSION_TEXT.m1.card).toBe('뜨거울수록 흰색, 식을수록 붉은색. 별도 그래요!');
  });
  it('wrong shot messages', () => {
    const b = wrongShotMessage('m3a', NAMED_STARS.betelgeuse);
    expect(b).toContain('적색');
    expect(b).toContain('색');
    expect(wrongShotMessage('m3a', NAMED_STARS.sirius)).toContain('백색');
    ['m1', 'm2a', 'm2b', 'm3a', 'm3b', 'm4'].forEach(p => {
      ['blue', 'blueWhite', 'white', 'yellowWhite', 'yellow', 'orange', 'red'].forEach(k => {
        const m = wrongShotMessage(p, { colorKey: k });
        expect(m.endsWith('온도는 색으로 비교해요.')).toBe(true);
        expect(m).not.toMatch(/\d|켈빈/);
      });
    });
  });
});

describe('m3b wrong-order message', () => {
  it('names the three stars in true order with colors', () => {
    const m = wrongShotMessage('m3b', NAMED_STARS.sirius);
    expect(m).toContain('리겔(청백색) → 시리우스(백색) → 베텔게우스(적색)');
    expect(m.endsWith('온도는 색으로 비교해요.')).toBe(true);
  });
});
