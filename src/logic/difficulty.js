// Difficulty selection (pure). Changes only game difficulty: falling speed, number of falling objects
// (spawn interval) and hull heat on collision. Judging, goals, time limits and cooling are untouched.
import {
  DIFFICULTY_MULTIPLIERS, DIFFICULTY_LABELS, STAR_HEAT, COOL_PER_SEC,
  SPAWN_INTERVAL_MS, M1_ASTEROID_INTERVAL_MS, M4_SCATTER_INTERVAL_MS, M1_BLOB_SPEED,
  M1_WHITE_GRACE_MS, M1_COOL_START_Y, M1_FALL_DISTANCE, FURNACE_STAGE_CUTS, BEAM_SPEED,
} from '../config/balance.js';
import { heatOnCollision } from './heat.js';

export const DIFFICULTY_KEYS = ['easy', 'normal', 'hard'];
export const DIFFICULTY = Object.fromEntries(
  DIFFICULTY_KEYS.map(k => [k, Object.freeze({ key: k, label: DIFFICULTY_LABELS[k], ...DIFFICULTY_MULTIPLIERS[k] })]),
);

/** Unknown / missing key -> normal. */
export function getDifficulty(key) {
  return typeof key === 'string' && Object.hasOwn(DIFFICULTY, key) ? DIFFICULTY[key] : DIFFICULTY.normal;
}

export const scaleSpeed = (v, key) => v * getDifficulty(key).speed;
export const scaleInterval = (ms, key) => ms * getDifficulty(key).spawnInterval;
/** Hull heat of one ship collision at a difficulty (kind 'star'|'furnace'|'asteroid'). */
export const scaledHeat = (kind, colorKey, key) => heatOnCollision(kind, colorKey) * getDifficulty(key).heat;

/**
 * Worst-case sustained heat check. If a student ignored dodging completely and every object that reaches
 * the ship's row hit, the heat inflow per second would be `hitHeat / interval` per hazard source. Cooling
 * removes COOL_PER_SEC. The returned fraction is the share of those hazards the student must dodge to
 * stay at or below the cooling rate (0 = may ignore all, 1 = must dodge every one).
 * Per-mission hazard sources (heat per hit uses the worst plausible colour; m2 uses the mean star):
 *   m1 asteroid every M1_ASTEROID_INTERVAL_MS (15 heat) + a cooled red blob every SPAWN m1 (5 heat; blobs are red by y 960)
 *   m2 a star every SPAWN m2 (mean STAR_HEAT)
 *   m3 a red trap every SPAWN m3 (5)
 *   m4 a blue scattered star every M4_SCATTER_INTERVAL_MS aimed at the ship (30)
 */
export function heatInflowPerSec(mission, key) {
  const s = ms => scaleInterval(ms, key) / 1000;
  const h = (kind, c) => scaledHeat(kind, c, key);
  const meanStar = Object.keys(STAR_HEAT).reduce((a, c) => a + h('star', c), 0) / Object.keys(STAR_HEAT).length;
  switch (mission) {
    case 'm1': return h('asteroid') / s(M1_ASTEROID_INTERVAL_MS) + h('furnace', 'red') / s(SPAWN_INTERVAL_MS.m1);
    case 'm2': return meanStar / s(SPAWN_INTERVAL_MS.m2);
    case 'm3': return h('star', 'red') / s(SPAWN_INTERVAL_MS.m3);
    case 'm4': return h('star', 'blue') / s(M4_SCATTER_INTERVAL_MS);
    default: throw new Error(`Unknown mission: ${mission}`);
  }
}

export function requiredDodgeFraction(mission, key) {
  const inflow = heatInflowPerSec(mission, key);
  return Math.max(0, 1 - COOL_PER_SEC / inflow);
}

/**
 * m1 white grace at the fastest (hard) blob speed. A beam fired from the lowest ship position while the
 * blob is still white (just above the white/yellow cut) must connect before the blob has been non-white
 * for more than M1_WHITE_GRACE_MS. Beams spawn about SHIP_BODY_RADIUS above the ship centre.
 */
export function M1_HARD_GRACE_CHECK(key = 'hard') {
  const blobV = scaleSpeed(M1_BLOB_SPEED.max, key);
  const whiteEndY = M1_COOL_START_Y + FURNACE_STAGE_CUTS[0] * M1_FALL_DISTANCE;
  const beamY = 916; // lowest ship y 960 (shipMaxY) minus the beam spawn offset (~44 px)
  const t = (beamY - whiteEndY) / (BEAM_SPEED + blobV); // seconds until contact, fired at the last white moment
  const blobY = whiteEndY + blobV * t;
  const nonWhiteMs = t * 1000;
  return { ok: nonWhiteMs <= M1_WHITE_GRACE_MS, contactMs: nonWhiteMs, blobY, whiteEndY, blobV };
}
