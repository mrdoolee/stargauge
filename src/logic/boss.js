// Mission 4 boss logic (pure): attack/gap cycle, fans, aim, warm-up, hp stages, safe bullet speed, sway, timer text.
import {
  BOSS_ATTACK_MS, BOSS_GAP_MS, REACTION_FLOOR_SEC, AIM_MAX_ANGLE_DEG, WARMUP_MS, WARMUP_DENSITY, BOSS_HP, BOSS_MIN_SHOT_SPEED,
} from '../config/balance.js';
import { getDifficulty } from './difficulty.js';
import { speedFor, canLaunch } from './speed.js';

const MAX_FAN_ANGLE_DEG = 85; // keeps vy > 0 whatever the caller passes

/**
 * Attack (BOSS_ATTACK_MS[stage]) then gap (BOSS_GAP_MS), repeating, from tInStageMs = 0.
 * gapJustStarted is true when an attack->gap boundary lies in (prevTMs, tMs]; pass the previous frame's time.
 */
export function bossCycle(stage, tInStageMs, prevTMs = null) {
  const attack = BOSS_ATTACK_MS[stage];
  const period = attack + BOSS_GAP_MS;
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
 * After a pierce: hp left -> same stage; hp 0 -> next stage with its full hp (BOSS_HP[stage]);
 * hp 0 on the last stage -> cleared.
 */
export function bossStageFromHp({ stage, hp }) {
  if (hp > 0) return { stage, hp, cleared: false };
  if (stage >= BOSS_HP.length) return { stage, hp: 0, cleared: true };
  return { stage: stage + 1, hp: BOSS_HP[stage], cleared: false };
}

/**
 * Speed of one boss bullet fired from fromY at a ship on shipY: the hazard speed for the tier, capped so the
 * reaction floor holds (canLaunch). null when even the capped speed is below BOSS_MIN_SHOT_SPEED.
 */
export function bossShotSpeed({ fromY, shipY, diffKey, tier = 0, rng = Math.random }) {
  const key = getDifficulty(diffKey).key;
  const cap = 0.999 * (shipY - fromY) / REACTION_FLOOR_SEC.hazard[key]; // 0.1% margin: no float edge
  const v = Math.min(speedFor('hazard', key, tier, rng), cap);
  if (!(v >= BOSS_MIN_SHOT_SPEED)) return null;
  return canLaunch({ fromY, shipY, speedPxS: v, category: 'hazard', diffKey: key }) ? v : null;
}

/** Horizontal sway offset (px) at time tMs. */
export function swayOffset(tMs, amp, periodMs, phase = 0) {
  return amp * Math.sin((2 * Math.PI * tMs) / periodMs + phase);
}

/** m:ss timer text (rounds up, never negative). */
export function formatTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
