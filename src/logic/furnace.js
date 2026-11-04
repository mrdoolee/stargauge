import { FURNACE_STAGES } from './temperature.js';
import {
  FURNACE_STAGE_CUTS, M1_COOL_START_Y, M1_FALL_DISTANCE, M1_WHITE_GRACE_MS, M1_PRACTICE_TOAST_GAP_MS,
  M1_BLOB_START_WEIGHTS, M1_WHITE_GUARANTEE,
} from '../config/balance.js';

/** Stage key of a cooling furnace blob given the fraction (0..1) of its fall completed. */
export function furnaceStageAt(fraction) {
  let i = 0;
  for (const cut of FURNACE_STAGE_CUTS) if (fraction >= cut) i += 1;
  return FURNACE_STAGES[i].key;
}

/**
 * Fall fraction of a blob at screen y. Counting starts at the bottom of the HUD band, so a blob
 * never cools while it is still hidden under the HUD (0 above startY).
 */
export function furnaceFallFraction(y, { startY = M1_COOL_START_Y, distance = M1_FALL_DISTANCE } = {}) {
  return Math.max(0, y - startY) / distance;
}

/**
 * Judge-side "is it white?": white now, or it left white at most graceMs ago (a hit on the frame the
 * blob turns yellow is a timing slip, not a misunderstanding). msSinceWhiteEnded: null/undefined = never white-ended.
 */
export function countsAsWhite(stageKey, msSinceWhiteEnded, graceMs = M1_WHITE_GRACE_MS) {
  if (stageKey === 'white') return true;
  return typeof msSinceWhiteEnded === 'number' && msSinceWhiteEnded >= 0 && msSinceWhiteEnded <= graceMs;
}

/** Practice feedback toast gate: shows the first time (lastMs null), then at most once per gapMs. */
export function practiceToastDue(lastMs, nowMs, gapMs = M1_PRACTICE_TOAST_GAP_MS) {
  return lastMs === null || lastMs === undefined || nowMs - lastMs >= gapMs;
}

/**
 * Weighted starting stage of a new blob. After M1_WHITE_GUARANTEE non-white starts in a row the next one
 * is white, so a white target always shows up. sinceWhite = non-white starts since the last white one.
 */
export function pickBlobStart({ sinceWhite, rng = Math.random, weights = M1_BLOB_START_WEIGHTS, guarantee = M1_WHITE_GUARANTEE }) {
  if (sinceWhite >= guarantee) return { stage: 'white', sinceWhite: 0 };
  const keys = Object.keys(weights);
  const total = keys.reduce((s, k) => s + weights[k], 0);
  let r = rng() * total;
  let stage = keys[keys.length - 1];
  for (const k of keys) {
    if (r < weights[k]) { stage = k; break; }
    r -= weights[k];
  }
  return { stage, sinceWhite: stage === 'white' ? 0 : sinceWhite + 1 };
}

/** Fall fraction a blob of this starting stage begins at (it is already as cooled as that stage's cut). */
export function stageStartFraction(stageKey) {
  if (stageKey === 'yellow') return FURNACE_STAGE_CUTS[0];
  if (stageKey === 'orange') return FURNACE_STAGE_CUTS[1];
  if (stageKey === 'red') return FURNACE_STAGE_CUTS[2];
  return 0;
}
