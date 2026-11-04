import { describe, it, expect } from 'vitest';
import { furnaceStageAt } from '../../src/logic/furnace.js';
import { FURNACE_STAGE_CUTS } from '../../src/config/balance.js';

describe('furnaceStageAt', () => {
  it('starts white and ends red', () => {
    expect(furnaceStageAt(0)).toBe('white');
    expect(furnaceStageAt(1)).toBe('red');
    expect(furnaceStageAt(5)).toBe('red');
    expect(furnaceStageAt(-1)).toBe('white');
  });
  it('steps white -> yellow -> orange -> red at the cut points', () => {
    const [a, b, c] = FURNACE_STAGE_CUTS;
    expect(furnaceStageAt(a - 0.001)).toBe('white');
    expect(furnaceStageAt(a)).toBe('yellow');
    expect(furnaceStageAt(b - 0.001)).toBe('yellow');
    expect(furnaceStageAt(b)).toBe('orange');
    expect(furnaceStageAt(c - 0.001)).toBe('orange');
    expect(furnaceStageAt(c)).toBe('red');
  });
  it('is monotonic', () => {
    const rank = { white: 0, yellow: 1, orange: 2, red: 3 };
    let prev = 0;
    for (let f = 0; f <= 1; f += 0.01) {
      const r = rank[furnaceStageAt(f)];
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
  });
});

import { furnaceFallFraction, countsAsWhite, practiceToastDue } from '../../src/logic/furnace.js';
import {
  M1_COOL_START_Y, M1_WHITE_GRACE_MS, M1_PRACTICE_TOAST_GAP_MS, HUD_BAND_BOTTOM,
} from '../../src/config/balance.js';

describe('furnaceFallFraction (cooling measured from below the HUD)', () => {
  it('stays 0 while the blob is still under the HUD band', () => {
    expect(M1_COOL_START_Y).toBeGreaterThanOrEqual(HUD_BAND_BOTTOM);
    expect(furnaceFallFraction(-60)).toBe(0);
    expect(furnaceFallFraction(200)).toBe(0);
    expect(furnaceFallFraction(HUD_BAND_BOTTOM)).toBe(0);
  });
  it('keeps a blob visibly white until roughly y 600-650', () => {
    expect(furnaceStageAt(furnaceFallFraction(600))).toBe('white');
    expect(furnaceStageAt(furnaceFallFraction(650))).toBe('yellow');
  });
  it('turns red well before the bottom of the screen', () => {
    expect(furnaceStageAt(furnaceFallFraction(1000))).toBe('red');
  });
});

describe('countsAsWhite (grace window)', () => {
  it('white is always white', () => {
    expect(countsAsWhite('white', null)).toBe(true);
  });
  it('a blob that left white within the grace window still counts', () => {
    expect(M1_WHITE_GRACE_MS).toBeGreaterThanOrEqual(250);
    expect(M1_WHITE_GRACE_MS).toBeLessThanOrEqual(400);
    expect(countsAsWhite('yellow', 0)).toBe(true);
    expect(countsAsWhite('yellow', M1_WHITE_GRACE_MS)).toBe(true);
  });
  it('after the grace window it is no longer white', () => {
    expect(countsAsWhite('yellow', M1_WHITE_GRACE_MS + 1)).toBe(false);
    expect(countsAsWhite('red', null)).toBe(false);
    expect(countsAsWhite('orange', undefined)).toBe(false);
  });
});

describe('practiceToastDue', () => {
  it('shows the first time, then at most once per gap', () => {
    expect(practiceToastDue(null, 0)).toBe(true);
    expect(practiceToastDue(0, M1_PRACTICE_TOAST_GAP_MS - 1)).toBe(false);
    expect(practiceToastDue(0, M1_PRACTICE_TOAST_GAP_MS)).toBe(true);
    expect(M1_PRACTICE_TOAST_GAP_MS).toBeGreaterThanOrEqual(3000);
  });
});

import { pickBlobStart, stageStartFraction } from '../../src/logic/furnace.js';
import { M1_BLOB_START_WEIGHTS, M1_WHITE_GUARANTEE } from '../../src/config/balance.js';

describe('pickBlobStart (mixed starting colors)', () => {
  it('forces white after M1_WHITE_GUARANTEE non-white starts in a row', () => {
    const rng = () => 0.99; // always the last (red) bucket
    let sinceWhite = 0;
    for (let i = 0; i < M1_WHITE_GUARANTEE; i++) {
      const r = pickBlobStart({ sinceWhite, rng });
      expect(r.stage).toBe('red');
      sinceWhite = r.sinceWhite;
    }
    const forced = pickBlobStart({ sinceWhite, rng });
    expect(forced.stage).toBe('white');
    expect(forced.sinceWhite).toBe(0);
  });
  it('matches the weights over many draws', () => {
    const counts = { white: 0, yellow: 0, orange: 0, red: 0 };
    const N = 10000;
    // Independent draws (sinceWhite 0 each time): the weighting itself, without the white guarantee's nudge.
    for (let i = 0; i < N; i++) counts[pickBlobStart({ sinceWhite: 0 }).stage] += 1;
    for (const k of Object.keys(counts)) expect(Math.abs(counts[k] / N - M1_BLOB_START_WEIGHTS[k])).toBeLessThan(0.03);
  });
});

describe('stageStartFraction', () => {
  it('maps stages to the cut points', () => {
    expect(stageStartFraction('white')).toBe(0);
    expect(stageStartFraction('yellow')).toBe(FURNACE_STAGE_CUTS[0]);
    expect(stageStartFraction('orange')).toBe(FURNACE_STAGE_CUTS[1]);
    expect(stageStartFraction('red')).toBe(FURNACE_STAGE_CUTS[2]);
  });
  it('a yellow start is never judged white', () => {
    expect(furnaceStageAt(stageStartFraction('yellow'))).toBe('yellow');
    expect(countsAsWhite('yellow', null)).toBe(false);
  });
});
