// Speed bands, reaction floors, safe launch distance and aiming (pure).
import {
  SPEED_BANDS_H, REACTION_FLOOR_SEC, AIM_MAX_ANGLE_DEG, HUD_BAND_BOTTOM, SHIP_START_Y,
} from '../config/balance.js';
import { GAME_HEIGHT } from '../config/game.js';
import { getDifficulty } from './difficulty.js';

const TIERS = 4;

/** Speed range (px/s) for a tension tier 0..3. Easy ignores the tier and returns the whole band. */
export function speedBand(category, diffKey, tier) {
  const [loH, hiH] = SPEED_BANDS_H[category][getDifficulty(diffKey).key];
  const lo = loH * GAME_HEIGHT;
  const hi = hiH * GAME_HEIGHT;
  if (getDifficulty(diffKey).key === 'easy') return { min: lo, max: hi };
  const t = Math.min(TIERS - 1, Math.max(0, Math.trunc(tier) || 0));
  return { min: lo + (hi - lo) * t / TIERS, max: lo + (hi - lo) * (t + 1) / TIERS };
}

export function speedFor(category, diffKey, tier, rng = Math.random) {
  const { min, max } = speedBand(category, diffKey, tier);
  return min + (max - min) * rng();
}

/** Seconds from the HUD band bottom to the ship's base row at this speed (objects entering from the top). */
export const topEntryReactionSec = speedPxS => (SHIP_START_Y - HUD_BAND_BOTTOM) / speedPxS;

export const safeDistancePx = (category, diffKey, speedPxS) =>
  REACTION_FLOOR_SEC[category][getDifficulty(diffKey).key] * speedPxS;

/** A hazard may start at fromY only if it is at least the safe distance above the ship. */
export const canLaunch = ({ fromY, shipY, speedPxS, category, diffKey }) =>
  shipY - fromY >= safeDistancePx(category, diffKey, speedPxS);

/**
 * Speed of one hazard shot fired from fromY at a ship on shipY: the hazard speed for the tier, capped so the reaction
 * floor holds (canLaunch). null when even the capped speed is below minSpeed (ship right under the muzzle).
 */
export function cappedShotSpeed({ fromY, shipY, diffKey, tier = 0, minSpeed, rng = Math.random }) {
  const key = getDifficulty(diffKey).key;
  const cap = 0.999 * (shipY - fromY) / REACTION_FLOOR_SEC.hazard[key]; // 0.1% margin: no float edge
  const v = Math.min(speedFor('hazard', key, tier, rng), cap);
  if (!(v >= minSpeed)) return null;
  return canLaunch({ fromY, shipY, speedPxS: v, category: 'hazard', diffKey: key }) ? v : null;
}

/** Velocity of magnitude speedPxS from `from` toward `to`, always downward, angle (from +y) clamped. */
export function aimVelocity(from, to, speedPxS, maxAngleDeg = AIM_MAX_ANGLE_DEG) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const max = maxAngleDeg * Math.PI / 180;
  let angle = 0;
  if (dx !== 0) angle = dy > 0 ? Math.atan2(dx, dy) : Math.sign(dx) * max;
  angle = Math.max(-max, Math.min(max, angle));
  return { vx: speedPxS * Math.sin(angle), vy: speedPxS * Math.cos(angle) };
}

/** One value per formation: draw() runs when formationIndex changes, otherwise the cached value is returned. */
export function createFormationMemo() {
  let idx = null;
  let val;
  return (formationIndex, draw) => {
    if (formationIndex !== idx) { idx = formationIndex; val = draw(); }
    return val;
  };
}
