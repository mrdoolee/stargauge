import { describe, it, expect } from 'vitest';
import { nextAfterPhaseDone, phaseResolution, transitionStep, advanceTransition, splitEmphasis } from '../../src/logic/transition.js';
import { TRANSITION_CLEAR_MS, TRANSITION_BANNER_MS } from '../../src/config/balance.js';

describe('nextAfterPhaseDone', () => {
  it('overheat wins, then a next phase transitions, else the mission completes', () => {
    expect(nextAfterPhaseDone({ heatFull: true, hasNextPhase: true })).toBe('restart');
    expect(nextAfterPhaseDone({ heatFull: true, hasNextPhase: false })).toBe('restart');
    expect(nextAfterPhaseDone({ heatFull: false, hasNextPhase: true })).toBe('transition');
    expect(nextAfterPhaseDone({ heatFull: false, hasNextPhase: false })).toBe('complete');
  });
});

describe('transitionStep', () => {
  it('clear lasts TRANSITION_CLEAR_MS, then banner lasts TRANSITION_BANNER_MS, then done', () => {
    expect(TRANSITION_CLEAR_MS).toBe(400);
    expect(TRANSITION_BANNER_MS).toBe(2600);
    expect(transitionStep({ step: 'clear', ms: 0 }, 399).step).toBe('clear');
    const b = transitionStep({ step: 'clear', ms: 0 }, 400);
    expect(b).toEqual({ step: 'banner', ms: 0 });
    expect(transitionStep(b, 2599).step).toBe('banner');
    expect(transitionStep(b, 2600).step).toBe('done');
  });
  it('does not mutate its input', () => {
    const s = { step: 'clear', ms: 10 };
    transitionStep(s, 50);
    expect(s).toEqual({ step: 'clear', ms: 10 });
  });
  it('capped 100 ms frames reach the same result as one big step', () => {
    let s = { step: 'clear', ms: 0 };
    let frames = 0;
    while (s.step !== 'done') { s = transitionStep(s, 100); frames += 1; }
    expect(frames).toBe((TRANSITION_CLEAR_MS + TRANSITION_BANNER_MS) / 100);
    expect(transitionStep({ step: 'clear', ms: 0 }, 5000).step).toBe('done');
  });
  it('done stays done', () => {
    expect(transitionStep({ step: 'done', ms: 0 }, 100).step).toBe('done');
  });
  it('advanceTransition mutates in place with the same result', () => {
    const s = { step: 'clear', ms: 0 };
    expect(advanceTransition(s, 450)).toBe(s);
    expect(s).toEqual({ step: 'banner', ms: 50 });
  });
});

describe('splitEmphasis', () => {
  it('splits a line around the emphasis word', () => {
    expect(splitEmphasis('이번엔 태양보다 차가운 별', '차가운')).toEqual([
      { text: '이번엔 태양보다 ', emph: false }, { text: '차가운', emph: true }, { text: ' 별', emph: false },
    ]);
  });
  it('no emphasis or no match keeps one plain segment', () => {
    expect(splitEmphasis('안녕', undefined)).toEqual([{ text: '안녕', emph: false }]);
    expect(splitEmphasis('안녕', '없음')).toEqual([{ text: '안녕', emph: false }]);
  });
});

describe('phaseResolution (decided after the physics step)', () => {
  it('nothing pending -> null', () => {
    expect(phaseResolution({ pending: false, restarting: false, heatFull: false, hasNextPhase: true })).toBe(null);
  });
  it('a restart that already started owns the scene -> null', () => {
    expect(phaseResolution({ pending: true, restarting: true, heatFull: true, hasNextPhase: true })).toBe(null);
  });
  it('hull full in the same step beats the transition / mission end', () => {
    expect(phaseResolution({ pending: true, restarting: false, heatFull: true, hasNextPhase: true })).toBe('restart');
    expect(phaseResolution({ pending: true, restarting: false, heatFull: true, hasNextPhase: false })).toBe('restart');
  });
  it('otherwise transition or complete', () => {
    expect(phaseResolution({ pending: true, restarting: false, heatFull: false, hasNextPhase: true })).toBe('transition');
    expect(phaseResolution({ pending: true, restarting: false, heatFull: false, hasNextPhase: false })).toBe('complete');
  });
});
