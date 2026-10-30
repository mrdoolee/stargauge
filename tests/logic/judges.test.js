import { describe, it, expect } from 'vitest';
import { predicateJudge, orderedJudge } from '../../src/logic/judges.js';

describe('predicateJudge', () => {
  it('wraps predicate', () => {
    const j = predicateJudge(t => t.v > 1);
    expect(j.judge({ v: 2 })).toEqual({ correct: true });
    expect(j.judge({ v: 0 }).correct).toBe(false);
  });
});

describe('orderedJudge', () => {
  it('requires order, keeps progress on wrong', () => {
    const j = orderedJudge(['rigel', 'sirius', 'betelgeuse']);
    let r = j.judge({ id: 'sirius' });
    expect(r).toEqual({ correct: false, done: false, expectedId: 'rigel' });
    expect(j.progress).toBe(0);
    r = j.judge({ id: 'rigel' });
    expect(r.correct).toBe(true);
    expect(j.progress).toBe(1);
    j.judge({ id: 'betelgeuse' });
    expect(j.progress).toBe(1);
    r = j.judge({ id: 'sirius' });
    expect(r.done).toBe(false);
    expect(j.progress).toBe(2);
    r = j.judge({ id: 'betelgeuse' });
    expect(r.correct).toBe(true);
    expect(r.done).toBe(true);
  });
});
