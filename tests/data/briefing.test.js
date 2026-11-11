import { describe, it, expect } from 'vitest';
import { BRIEFING, briefingParts } from '../../src/data/briefing.js';
import { BRIEFING_EXPRESSIONS } from '../../src/config/assets.js';

const all = b => [b.title, b.line, ...b.bullets, b.goal].join('\n');
// Line breaks are layout only: copy is compared with each line break read as a space.
const flat = s => s.replace(/\n/g, ' ');

describe('BRIEFING', () => {
  it('has m1..m4 with every field and exactly 3 bullets', () => {
    for (const m of ['m1', 'm2', 'm3', 'm4']) {
      const b = BRIEFING[m];
      expect(b.title).toBeTruthy();
      expect(b.expression).toBeTruthy();
      expect(b.line).toBeTruthy();
      expect(b.image).toBeTruthy();
      expect(b.goal).toBeTruthy();
      expect(b.bullets).toHaveLength(3);
      b.bullets.forEach(t => expect(t).toBeTruthy());
    }
    expect(BRIEFING.m2.image).toBe('gauge');
    expect(BRIEFING.m3.image).toBe('briefing-m3');
  });

  it('copy matches the spec', () => {
    expect(flat(BRIEFING.m1.line)).toBe('대원, 쇳물은 뜨거울수록 흰색, 식을수록 붉은색이야.');
    expect(flat(BRIEFING.m1.goal)).toBe('가장 뜨거운 쇳물을 쏘세요.');
    expect(flat(BRIEFING.m2.line)).toBe('별은 온도에 따라 색이 달라.');
    expect(flat(BRIEFING.m2.goal)).toBe('태양보다 뜨거운 별만 쏘고, 나머지는 피하세요.');
    expect(flat(BRIEFING.m2.bullets[2])).toBe('태양은 황색 별이에요. 태양을 기준으로 비교해요.');
    expect(flat(BRIEFING.m3.line)).toBe('크고 밝다고 뜨거운 게 아니야. 색을 봐!');
    expect(BRIEFING.m3.bullets.map(flat)).toEqual([
      '별을 측정하면 그 별의 표면 온도만큼 빔이 충전돼요.',
      '별의 크기와 밝기는 표면 온도와 관계없어요.',
      '드론의 방어막과 같거나 더 뜨거운 색으로 충전해야 뚫려요.',
    ]);
    expect(flat(BRIEFING.m3.goal)).toBe('뜨거운 별로 빔을 충전해서 방해 드론을 격추하세요.');
    expect(flat(BRIEFING.m4.line)).toBe('마지막 임무야. 보스 함선의 장갑을 뚫어!');
    expect(BRIEFING.m4.bullets.map(flat)).toEqual([
      '장갑 색과 같거나 더 뜨거운 색의 별로 충전해야 뚫려요.',
      '보스가 쉬는 틈에는 탄이 오지 않아요.',
      '단계가 오를수록 장갑이 더 뜨거운 색으로 바뀌어요.',
    ]);
    expect(flat(BRIEFING.m4.goal)).toBe('제한 시간 안에 보스 함선을 물리치세요. 날아오는 탄은 피하세요.');
    expect(BRIEFING.m1.title).toBe('용광로 탈출');
    expect(BRIEFING.m2.title).toBe('스타게이지 보정');
    expect(BRIEFING.m3.title).toBe('밝기의 함정');
    expect(BRIEFING.m4.title).toBe('보스 함선');
    expect(['m1', 'm2', 'm3', 'm4'].map(m => BRIEFING[m].expression)).toEqual(['normal', 'serious', 'surprised', 'serious']);
  });

  it('briefings never give away a mission answer', () => {
    for (const m of ['m3', 'm4']) {
      for (const name of ['리겔', '시리우스', '베텔게우스', '오리온', '큰개자리', '보석상자']) expect(all(BRIEFING[m])).not.toContain(name);
    }
    expect(all(BRIEFING.m4)).not.toContain('청색'); // the answer to m4 question 1
  });

  it('expressions are known', () => {
    for (const m of ['m1', 'm2', 'm3', 'm4']) expect(BRIEFING_EXPRESSIONS).toContain(BRIEFING[m].expression);
  });
});

describe('briefingParts', () => {
  it('missing art falls back', () => {
    expect(briefingParts({ mission: 'm1', hasCaptain: false, hasImage: () => false })).toEqual({ portrait: 'silhouette', picture: 'panel' });
    expect(briefingParts({ mission: 'm2', hasCaptain: false, hasImage: () => false }).picture).toBe('gauge');
    expect(briefingParts({ mission: 'm1', hasCaptain: true, hasImage: () => true })).toEqual({ portrait: 'atlas', picture: 'image' });
  });
});
