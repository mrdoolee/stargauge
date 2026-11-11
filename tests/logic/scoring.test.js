import { describe, it, expect } from 'vitest';
import { missionStars } from '../../src/logic/scoring.js';

describe('missionStars', () => {
  it.each([[0, 0, 3], [1, 0, 3], [0, 1, 2], [4, 0, 2], [5, 0, 1], [1, 1, 2], [5, 2, 1]])(
    'wrong %i restarts %i -> %i',
    (w, r, e) => {
      expect(missionStars({ wrongShots: w, restarts: r })).toBe(e);
    },
  );
});

describe('missionStars with a timeout (m4: time ran out before the boss fell)', () => {
  it('caps at 2 stars but is not a failure (never below what the shots earn otherwise)', () => {
    expect(missionStars({ wrongShots: 0, restarts: 0, timedOut: true })).toBe(2);
    expect(missionStars({ wrongShots: 4, restarts: 0, timedOut: true })).toBe(2);
    expect(missionStars({ wrongShots: 5, restarts: 0, timedOut: true })).toBe(1);
    expect(missionStars({ wrongShots: 0, restarts: 1, timedOut: true })).toBe(2);
  });
  it('no timeout keeps the old rating', () => {
    expect(missionStars({ wrongShots: 0, restarts: 0, timedOut: false })).toBe(3);
    expect(missionStars({ wrongShots: 0, restarts: 0 })).toBe(3);
  });
});
