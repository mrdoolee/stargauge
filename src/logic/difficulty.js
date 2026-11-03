// Difficulty selection (pure). Changes only game difficulty: falling speed, number of falling objects
// (formation / volley gaps) and hull heat on collision. Judging, goals, time limits and cooling are untouched.
import {
  DIFFICULTY_MULTIPLIERS, DIFFICULTY_LABELS, STAR_HEAT, COOL_PER_SEC,
  FORMATION_GAP_MS, FORMATION_MEAN_SIZE, FORMATION_MEAN_SPAN_MS, M1_ASTEROID_SLOT_CHANCE,
  BOSS_ATTACK_MS, BOSS_GAP_MS, BOSS_VOLLEY_MS, BOSS_FAN, BOSS_FAN_SHIP_HITS, M1_BLOB_SPEED,
  M1_WHITE_GRACE_MS, M1_COOL_START_Y, M1_FALL_DISTANCE, FURNACE_STAGE_CUTS, BEAM_SPEED,
  SHIP_HALF_HEIGHT, BEAM_SPAWN_OFFSET_Y,
} from '../config/balance.js';
import { shipMaxY } from '../input/TouchControls.js';
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
 * Worst-case sustained heat check (tier 0, after warm-up). If a student ignored dodging completely and every
 * hazard that reaches the ship's row hit, the heat inflow per second is computed per mission below. Cooling
 * removes COOL_PER_SEC. requiredDodgeFraction is the share of those hits the student must avoid to stay at or
 * below the cooling rate (0 = may ignore all, 1 = must dodge every one).
 * m1/m2/m3: a formation of FORMATION_MEAN_SIZE objects arrives every scaleInterval(FORMATION_GAP_MS) plus the
 *   formation's own FORMATION_MEAN_SPAN_MS. Heat per slot: m1 a blob that reaches the ship row red (FURNACE red),
 *   or an asteroid for M1_ASTEROID_SLOT_CHANCE of the slots; m2 the mean star heat; m3 a red trap (conservative:
 *   every candidate accepted).
 * m4: boss cycle = BOSS_ATTACK_MS[stage] + BOSS_GAP_MS. One volley every scaleInterval(BOSS_VOLLEY_MS[stage]) in
 *   the attack window, each blue (30) shot hits. A fan arrives spread wider than the ship, so a standing ship takes
 *   at most BOSS_FAN_SHIP_HITS of it; stage 3 adds one aimed shot where the difficulty allows aim (not easy).
 *   With no `stage`, m4 returns the worst of the three stages.
 */
export function heatInflowPerSec(mission, key, stage) {
  const h = (kind, c) => scaledHeat(kind, c, key);
  const meanStar = Object.keys(STAR_HEAT).reduce((a, c) => a + h('star', c), 0) / Object.keys(STAR_HEAT).length;
  const formation = (gapMs, perSlot) =>
    (FORMATION_MEAN_SIZE * perSlot) / ((scaleInterval(gapMs, key) + FORMATION_MEAN_SPAN_MS) / 1000);
  const boss = st => {
    const attack = BOSS_ATTACK_MS[st];
    const volleys = attack / scaleInterval(BOSS_VOLLEY_MS[st], key);
    const aimed = st === 3 && getDifficulty(key).key !== 'easy' ? 1 : 0;
    const fan = st === 1 ? 1 : Math.min(BOSS_FAN_SHIP_HITS, (BOSS_FAN[st].count[0] + BOSS_FAN[st].count[1]) / 2);
    return (volleys * (fan + aimed) * h('star', 'blue')) / ((attack + BOSS_GAP_MS) / 1000);
  };
  switch (mission) {
    case 'm1': return formation(FORMATION_GAP_MS.m1,
      (1 - M1_ASTEROID_SLOT_CHANCE) * h('furnace', 'red') + M1_ASTEROID_SLOT_CHANCE * h('asteroid'));
    case 'm2': return formation(FORMATION_GAP_MS.m2, meanStar);
    case 'm3': return formation(FORMATION_GAP_MS.m3, h('star', 'red'));
    case 'm4': return stage ? boss(stage) : Math.max(boss(1), boss(2), boss(3));
    default: throw new Error(`Unknown mission: ${mission}`);
  }
}

export function requiredDodgeFraction(mission, key, stage) {
  const inflow = heatInflowPerSec(mission, key, stage);
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
  // Lowest ship centre (shipMaxY, derived from the controls layout) minus the beam spawn offset.
  const beamY = shipMaxY({ shipHalfHeight: SHIP_HALF_HEIGHT }) - BEAM_SPAWN_OFFSET_Y;
  const t = (beamY - whiteEndY) / (BEAM_SPEED + blobV); // seconds until contact, fired at the last white moment
  const blobY = whiteEndY + blobV * t;
  const nonWhiteMs = t * 1000;
  return { ok: nonWhiteMs <= M1_WHITE_GRACE_MS, contactMs: nonWhiteMs, blobY, whiteEndY, blobV };
}
