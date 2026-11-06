import { describe, it, expect } from 'vitest';
import { MISSION_TEXT, BANNER_TEXT, wrongShotMessage } from '../../src/data/copy.js';

describe('copy', () => {
  it('mission text', () => {
    ['m1', 'm2a', 'm2b', 'm3', 'm4'].forEach(id => expect(MISSION_TEXT[id].instruction).toBeTruthy());
    expect(MISSION_TEXT.m1.card.replace(/\n/g, ' ')).toBe('뜨거울수록 흰색, 식을수록 붉은색. 별도 그래요!');
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

describe('banner copy', () => {
  it('has the stage-change, overheat and m4 end banners', () => {
    expect(BANNER_TEXT.m2.title).toBe('1단계 완료!');
    expect(BANNER_TEXT.m2.body).toContain('차가운');
    expect(BANNER_TEXT.m2.body).toContain(BANNER_TEXT.m2.emphasis);
    expect(BANNER_TEXT.m1.title).toBe('연습 끝!');
    expect(BANNER_TEXT.m1.body).toBe('이제 진짜예요! 흰색일 때만 쏘고,\n부딪히면 선체 온도가 올라가요.');
    expect(BANNER_TEXT.m1.body).toContain(BANNER_TEXT.m1.emphasis);
    expect(BANNER_TEXT.overheat).toEqual({ title: '선체 온도가\n가득 찼어요!', body: '이 미션을 처음부터 다시 해요.' });
    expect(BANNER_TEXT.m4Win.title).toBe('보스 함선을\n격파했어요!');
    expect(BANNER_TEXT.m4Flee.title).toBe('보스가 도망갔어요.');
  });
});
