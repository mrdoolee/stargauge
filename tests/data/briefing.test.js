import { describe, it, expect } from 'vitest';
import { BRIEFING, briefingParts } from '../../src/data/briefing.js';
import { BRIEFING_EXPRESSIONS } from '../../src/config/assets.js';

const all = b => [b.title, b.line, ...b.bullets, b.goal].join('\n');

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
    expect(BRIEFING.m1.line).toBe('대원, 쇳물은 뜨거울수록 흰색, 식을수록 붉은색이야.');
    expect(BRIEFING.m1.goal).toBe('가장 뜨거운 쇳물을 쏘세요.');
    expect(BRIEFING.m2.line).toBe('별은 온도에 따라 색이 달라.');
    expect(BRIEFING.m2.goal).toBe('태양보다 뜨거운 별만 쏘고, 나머지는 피하세요.');
    expect(BRIEFING.m2.bullets[2]).toBe('태양은 황색 별이에요. 태양을 기준으로 비교해요.');
    expect(BRIEFING.m3.line).toBe('크고 밝다고 뜨거운 게 아니야. 색을 봐!');
    expect(BRIEFING.m3.goal).toBe('세 별 중 가장 뜨거운 별을 찾아 쏘세요.');
    expect(BRIEFING.m4.line).toBe('마지막 임무야. 성단의 별을 모두 측정해!');
    expect(BRIEFING.m4.bullets[2]).toBe('실제 성단을 바탕으로 단순화했어요.');
    expect(BRIEFING.m4.goal).toBe('시간 안에 성단의 별을 모두 표시하세요. 흩어지는 청색 별은 피하세요.');
    expect(BRIEFING.m1.title).toBe('용광로 탈출');
    expect(BRIEFING.m2.title).toBe('스타게이지 보정');
    expect(BRIEFING.m3.title).toBe('밝기의 함정');
    expect(BRIEFING.m4.title).toBe('보석상자 성단');
    expect(['m1', 'm2', 'm3', 'm4'].map(m => BRIEFING[m].expression)).toEqual(['normal', 'serious', 'surprised', 'smile']);
  });

  it('briefings never give away a mission answer', () => {
    const t = all(BRIEFING.m3);
    for (const name of ['리겔', '시리우스', '베텔게우스']) expect(t).not.toContain(name);
    expect(all(BRIEFING.m4)).not.toContain('청색 별이 많');
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
