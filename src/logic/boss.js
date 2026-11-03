// Mission 4 boss logic (pure): stage by tagged fraction, attack/gap cycle, fans, safe launch sources.
import {
  BOSS_STAGE_AT, BOSS_ATTACK_MS, BOSS_GAP_MS, REACTION_FLOOR_SEC, AIM_MAX_ANGLE_DEG,
} from '../config/balance.js';
import { getDifficulty } from './difficulty.js';
import { speedBand, speedFor } from './speed.js';

const MAX_FAN_ANGLE_DEG = 85; // keeps vy > 0 whatever the caller passes

/** 1..3 from the fraction of cluster stars already tagged (0..1). */
export function bossStage(taggedFraction) {
  let stage = 1;
  BOSS_STAGE_AT.forEach((at, i) => { if (taggedFraction >= at) stage = i + 1; });
  return stage;
}

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

/**
 * Pick a non-boss blue cluster star to launch from. A source is eligible when the highest speed that still
 * respects the reaction floor (cap) is at least the tier-0 minimum; launch speed = min(speedFor(tier), cap).
 * Returns { member, speedPxS } or null.
 */
export function pickLaunchSource(members, ship, { diffKey, tier = 0, rng = Math.random, offsetY = 0 } = {}) {
  const key = getDifficulty(diffKey).key;
  const floor = REACTION_FLOOR_SEC.hazard[key];
  const minSpeed = speedBand('hazard', key, 0).min;
  const eligible = [];
  for (const m of members) {
    if (m.boss || m.star?.colorKey !== 'blue') continue;
    const cap = (ship.y - (m.obj.y + offsetY)) / floor;
    if (cap >= minSpeed) eligible.push({ member: m, cap });
  }
  if (!eligible.length) return null;
  const e = eligible[Math.min(eligible.length - 1, Math.floor(rng() * eligible.length))];
  return { member: e.member, speedPxS: Math.min(speedFor('hazard', key, tier, rng), e.cap) };
}
