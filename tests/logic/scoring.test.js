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
