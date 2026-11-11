// Difficulty selection (pure). Changes only game difficulty: falling speed, number of falling objects
// (formation / volley gaps) and hull heat on collision. Judging, goals, time limits and cooling are untouched.
import {
  DIFFICULTY_MULTIPLIERS, DIFFICULTY_LABELS, STAR_HEAT, COOL_PER_SEC,
  FORMATION_GAP_MS, FORMATION_MEAN_SIZE, FORMATION_MEAN_SPAN_MS, M1_ASTEROID_SLOT_CHANCE,
  BOSS_ATTACK_MS, BOSS_GAP_MS, BOSS_VOLLEY_MS, BOSS_FAN_SHIP_HITS, BOSS_AIMED_FROM_STAGE, BOSS_ESCORTS, BOSS_ESCORT_FIRE_MS, M4_STAR_POOL, M1_BLOB_SPEED,
  M1_WHITE_GRACE_MS, M1_COOL_START_Y, M1_FALL_DISTANCE, FURNACE_STAGE_CUTS, BEAM_SPEED,
  SHIP_HALF_HEIGHT, BEAM_SPAWN_OFFSET_Y, M3_STAR_POOL, DRONE_MAX_ON_SCREEN, DRONE_FIRE_MS, MISSED_STAR_SHARE, DRONE_ALIVE_DUTY,
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

/** Object slots per second of a formation mission: one formation per scaled gap plus its own span. */
export const formationSlotsPerSec = (gapMs, key) =>
  FORMATION_MEAN_SIZE / ((scaleInterval(gapMs, key) + FORMATION_MEAN_SPAN_MS) / 1000);

/**
 * Worst-case sustained heat check (tier 0, after warm-up). If a student ignored dodging completely and every
 * hazard that reaches the ship's row hit, the heat inflow per second is computed per mission below. Cooling
 * removes COOL_PER_SEC. requiredDodgeFraction is the share of those hits the student must avoid to stay at or
 * below the cooling rate (0 = may ignore all, 1 = must dodge every one).
 * m1/m2/m3/m4: a formation of FORMATION_MEAN_SIZE objects arrives every scaleInterval(FORMATION_GAP_MS) plus the
 *   formation's own FORMATION_MEAN_SPAN_MS. Heat per slot: m1 a blob that reaches the ship row red (FURNACE red),
 *   or an asteroid for M1_ASTEROID_SLOT_CHANCE of the slots; m2 the mean star heat over the 7 colors; m3 the mean
 *   star heat over the M3_STAR_POOL weights (charge stars, x MISSED_STAR_SHARE: the rest are shot or dodged) PLUS the drone bullets: DRONE_MAX_ON_SCREEN x DRONE_ALIVE_DUTY drones
 *   each firing every DRONE_FIRE_MS, one asteroid-heat hit per bullet (every bullet lands).
 * m4: the charge-star formations (mean star heat over the M4_STAR_POOL weights at FORMATION_GAP_MS.m4, x MISSED_STAR_SHARE) PLUS the boss PLUS the escort drones.
 *   Boss cycle = BOSS_ATTACK_MS[stage] + BOSS_GAP_MS[difficulty]. One volley every scaleInterval(BOSS_VOLLEY_MS[difficulty][stage]) in
 *   the attack window, each shot that hits costs the asteroid heat (scaledHeat('asteroid'), as BaseMissionScene.handleBulletHit applies to every
 *   enemy bullet). Volleys per window = ceil(attack / interval) (the first fires at the window
 *   start). A fan lands BOSS_FAN_SHIP_HITS shots on average on a standing ship (see balance.js); from BOSS_AIMED_FROM_STAGE a volley adds one aimed shot where the
 *   difficulty allows aim (not easy). Escorts: BOSS_ESCORTS[difficulty][stage] drones x DRONE_ALIVE_DUTY (the same UNMEASURED share of the time they are alive and firing as
 *   the m3 drones) each firing every BOSS_ESCORT_FIRE_MS, one asteroid-heat hit per bullet (every bullet lands, like m3).
 *   With no `stage`, m4 returns the worst of the three stages.
 */
export function heatInflowPerSec(mission, key, stage) {
  const h = (kind, c) => scaledHeat(kind, c, key);
  const meanStar = Object.keys(STAR_HEAT).reduce((a, c) => a + h('star', c), 0) / Object.keys(STAR_HEAT).length;
  const formation = (gapMs, perSlot) => formationSlotsPerSec(gapMs, key) * perSlot;
  const chargeStars = (gapMs, perSlot) => formation(gapMs, perSlot) * MISSED_STAR_SHARE;
  const poolStar = M3_STAR_POOL.reduce((a, c) => a + h('star', c), 0) / M3_STAR_POOL.length;
  const poolStar4 = M4_STAR_POOL.reduce((a, c) => a + h('star', c), 0) / M4_STAR_POOL.length;
  const dk = getDifficulty(key).key;
  const droneBullets = DRONE_MAX_ON_SCREEN * DRONE_ALIVE_DUTY * (1000 / DRONE_FIRE_MS[dk]) * h('asteroid');
  const boss = st => {
    const attack = BOSS_ATTACK_MS[st];
    const volleys = Math.ceil(attack / scaleInterval(BOSS_VOLLEY_MS[dk][st], key)); // a volley fires as the window opens
    const aimed = dk !== 'easy' && st >= BOSS_AIMED_FROM_STAGE ? 1 : 0;
    const fan = st === 1 ? 1 : BOSS_FAN_SHIP_HITS;
    const shots = (volleys * (fan + aimed) * h('asteroid')) / ((attack + BOSS_GAP_MS[dk]) / 1000); // engine: every enemy bullet = asteroid heat
    const escorts = BOSS_ESCORTS[dk][st] * DRONE_ALIVE_DUTY * (1000 / BOSS_ESCORT_FIRE_MS[dk]) * h('asteroid');
    return shots + escorts;
  };
  switch (mission) {
    case 'm1': return formation(FORMATION_GAP_MS.m1,
      (1 - M1_ASTEROID_SLOT_CHANCE) * h('furnace', 'red') + M1_ASTEROID_SLOT_CHANCE * h('asteroid'));
    case 'm2': return formation(FORMATION_GAP_MS.m2, meanStar);
    case 'm3': return chargeStars(FORMATION_GAP_MS.m3, poolStar) + droneBullets;
    case 'm4': return chargeStars(FORMATION_GAP_MS.m4, poolStar4) + (stage ? boss(stage) : Math.max(boss(1), boss(2), boss(3)));
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
