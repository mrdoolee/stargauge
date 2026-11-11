import { describe, it, expect } from 'vitest';
import { missionStars } from '../../src/logic/scoring.js';
import { CHARGE_STARS_THREE_MAX_WRONG, CHARGE_STARS_TWO_MAX_WRONG } from '../../src/config/balance.js';

describe('missionStars', () => {
  it.each([[0, 0, 3], [1, 0, 3], [0, 1, 2], [4, 0, 2], [5, 0, 1], [1, 1, 2], [5, 2, 1]])(
    'wrong %i restarts %i -> %i',
    (w, r, e) => {
      expect(missionStars({ wrongShots: w, restarts: r })).toBe(e);
    },
  );
});

describe('missionStars in charge mode', () => {
  it.each([[0, 0, 3], [3, 0, 3], [4, 0, 2], [8, 0, 2], [9, 0, 1], [0, 1, 2], [5, 1, 2], [9, 2, 1]])(
    'counted bounces %i restarts %i -> %i',
    (w, r, e) => {
      expect(missionStars({ wrongShots: w, restarts: r, chargeMode: true })).toBe(e);
    },
  );
  it('thresholds are the named charge-mode exports', () => {
    expect(CHARGE_STARS_THREE_MAX_WRONG).toBe(3);
    expect(CHARGE_STARS_TWO_MAX_WRONG).toBe(8);
  });
});

import { STARS_TIMEOUT_MAX } from '../../src/config/balance.js';

describe('missionStars when the time ran out before the goal (m4 boss fled)', () => {
  it('caps the rating at STARS_TIMEOUT_MAX (2): a run with no shots does not earn 3 stars', () => {
    expect(STARS_TIMEOUT_MAX).toBe(2);
    expect(missionStars({ wrongShots: 0, restarts: 0, chargeMode: true, timedOut: true })).toBe(2);
    expect(missionStars({ wrongShots: 8, restarts: 0, chargeMode: true, timedOut: true })).toBe(2);
    expect(missionStars({ wrongShots: 9, restarts: 0, chargeMode: true, timedOut: true })).toBe(1);
    expect(missionStars({ wrongShots: 0, restarts: 1, chargeMode: true, timedOut: true })).toBe(2);
  });
  it('without timedOut (or false) the rating is unchanged', () => {
    expect(missionStars({ wrongShots: 0, restarts: 0, chargeMode: true })).toBe(3);
    expect(missionStars({ wrongShots: 0, restarts: 0, chargeMode: true, timedOut: false })).toBe(3);
    expect(missionStars({ wrongShots: 1, restarts: 0, timedOut: false })).toBe(3);
  });
});
