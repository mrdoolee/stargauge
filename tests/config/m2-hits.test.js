import { describe, it, expect } from 'vitest';
import { M2_HITS_PER_COLOR, CHARGE_LOST_ON_SHIP_HIT } from '../../src/config/balance.js';

describe('2026-11-13 teacher requests (normal and hard only)', () => {
  it('m2: each color needs 2 hits on normal and hard, 1 on easy', () => {
    expect(M2_HITS_PER_COLOR).toEqual({ easy: 1, normal: 2, hard: 2 });
  });
  it('m3/m4: a ship hit drops the beam charge on normal and hard, not on easy', () => {
    expect(CHARGE_LOST_ON_SHIP_HIT).toEqual({ easy: false, normal: true, hard: true });
  });
});
