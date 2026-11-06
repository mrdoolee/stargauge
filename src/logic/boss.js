// Mission 4 boss logic (pure): attack/gap cycle, fans, aim, warm-up, hp stages, safe bullet speed, sway, timer text.
import {
  BOSS_ATTACK_MS, BOSS_GAP_MS, AIM_MAX_ANGLE_DEG, WARMUP_MS, WARMUP_DENSITY, BOSS_HP, BOSS_MIN_SHOT_SPEED, BOSS_VOLLEY_MS,
  BOSS_STAGE_FIND_SEC, M3_SEC_PER_SHOT, BOSS_FAN, BOSS_ESCORTS,
} from '../config/balance.js';
import { scaleInterval, getDifficulty } from './difficulty.js';
import { cappedShotSpeed } from './speed.js';
import { bossArmorColor, hitsToDown } from './charge.js';

export const BOSS_STAGES = BOSS_HP.normal.length;
const MAX_FAN_ANGLE_DEG = 85; // keeps vy > 0 whatever the caller passes

/** Per-difficulty balance tables (unknown key -> normal). */
export const bossHp = (stage, diffKey) => BOSS_HP[getDifficulty(diffKey).key][stage - 1];
export const bossGapMs = diffKey => BOSS_GAP_MS[getDifficulty(diffKey).key];
/** Fan of a stage-2/3 volley { count: [min, max], spreadDeg }; null in stage 1 (one straight shot). */
export const bossFan = (stage, diffKey) => BOSS_FAN[getDifficulty(diffKey).key][stage] ?? null;
/** Scaled launch interval inside an attack window of this stage. */
export const bossVolleyMs = (stage, diffKey) => scaleInterval(BOSS_VOLLEY_MS[getDifficulty(diffKey).key][stage], diffKey);
/** Escort drones the boss wants on screen in this stage (0 in stage 1 / unknown stage). */
export const escortTarget = (stage, diffKey) => BOSS_ESCORTS[getDifficulty(diffKey).key][stage] ?? 0;

/**
 * Attack (BOSS_ATTACK_MS[stage]) then gap (BOSS_GAP_MS[difficulty]), repeating, from tInStageMs = 0.
 * gapJustStarted is true when an attack->gap boundary lies in (prevTMs, tMs]; pass the previous frame's time.
 */
export function bossCycle(stage, tInStageMs, prevTMs = null, diffKey = 'normal') {
  const attack = BOSS_ATTACK_MS[stage];
  const period = attack + bossGapMs(diffKey);
  const t = Math.max(0, tInStageMs);
  const gapStarts = x => Math.floor((x - attack) / period) + 1; // boundaries at attack + k*period, k >= 0
  return {
    attacking: t % period < attack,
    gapJustStarted: prevTMs != null && gapStarts(t) > Math.max(0, gapStarts(Math.max(0, prevTMs))),
  };
}

/** `count` velocities of magnitude `speed` spread evenly over spreadDeg around baseAngleDeg (0 = straight down). */
export function fanVelocities(baseAngleDeg, count, spreadDeg, speed) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const off = count === 1 ? 0 : (i / (count - 1) - 0.5) * spreadDeg;
    const deg = Math.max(-MAX_FAN_ANGLE_DEG, Math.min(MAX_FAN_ANGLE_DEG, baseAngleDeg + off));
    const a = deg * Math.PI / 180;
    out.push({ vx: speed * Math.sin(a), vy: speed * Math.cos(a) });
  }
  return out;
}

/** Angle (deg from straight down) from `from` toward `to`, clamped to +-AIM_MAX_ANGLE_DEG; 0 if `to` is not below. */
export function angleToward(from, to, maxDeg = AIM_MAX_ANGLE_DEG) {
  const dy = to.y - from.y;
  if (dy <= 0) return 0;
  const deg = Math.atan2(to.x - from.x, dy) * 180 / Math.PI;
  return Math.max(-maxDeg, Math.min(maxDeg, deg));
}

/** Spec 3.1 warm-up for the boss: no aimed shots, sparser volleys during the first WARMUP_MS. */
export function bossWarmup(elapsedMs, aimAllowed, intervalMs) {
  const warm = elapsedMs < WARMUP_MS;
  return { warm, aim: !!aimAllowed && !warm, intervalMs: warm ? intervalMs / WARMUP_DENSITY : intervalMs };
}

/**
 * After a pierce: hp left -> same stage; hp 0 -> next stage with its full hp (bossHp of that stage and difficulty);
 * hp 0 on the last stage -> cleared.
 */
export function bossStageFromHp({ stage, hp, diffKey = 'normal' }) {
  if (hp > 0) return { stage, hp, cleared: false };
  if (stage >= BOSS_STAGES) return { stage, hp: 0, cleared: true };
  return { stage: stage + 1, hp: bossHp(stage + 1, diffKey), cleared: false };
}

/**
 * Time-model estimate (seconds) of the whole boss fight: per stage, BOSS_STAGE_FIND_SEC plus the shots needed when the student charges
 * with the armor's own color (1 damage per hit: the conservative case) x M3_SEC_PER_SHOT. Hotter charges would be faster.
 */
export function bossFightSec(diffKey) {
  let sec = 0;
  for (let st = 1; st <= BOSS_STAGES; st++) {
    const armor = bossArmorColor(st, diffKey);
    sec += BOSS_STAGE_FIND_SEC + hitsToDown(armor, armor, bossHp(st, diffKey)) * M3_SEC_PER_SHOT;
  }
  return sec;
}

/**
 * Speed of one boss bullet fired from fromY at a ship on shipY: the hazard speed for the tier, capped so the
 * reaction floor holds (canLaunch). null when even the capped speed is below BOSS_MIN_SHOT_SPEED.
 */
export function bossShotSpeed({ fromY, shipY, diffKey, tier = 0, rng = Math.random }) {
  return cappedShotSpeed({ fromY, shipY, diffKey, tier, minSpeed: BOSS_MIN_SHOT_SPEED, rng });
}

/** After a stage change: no volley until one full (difficulty-scaled) volley interval of the new stage has passed. */
export const stageChangeVolleyMs = (stage, diffKey) => bossVolleyMs(stage, diffKey);

/** Horizontal sway offset (px) at time tMs. */
export function swayOffset(tMs, amp, periodMs, phase = 0) {
  return amp * Math.sin((2 * Math.PI * tMs) / periodMs + phase);
}

/** m:ss timer text (rounds up, never negative). */
export function formatTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
