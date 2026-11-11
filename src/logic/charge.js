// Star-charged beam and shield rules (pure). Charge level = star color temperature step (blue 7 ... red 1).
import { STAR_COLORS } from './temperature.js';
import { getDifficulty } from './difficulty.js';
import { DRONE_SHIELDS, BOSS_ARMOR, HUD_BAND_BOTTOM } from '../config/balance.js';

/** Beams only meet enemies the student can see: not while they fly in behind the HUD band (above HUD_BAND_BOTTOM). */
export const enemyBeamable = enemy => enemy.y >= HUD_BAND_BOTTOM;

const LEVELS = STAR_COLORS.length;

/** 0 for null / unknown, else 7 - hottest-first index. */
export function chargeLevel(colorKey) {
  const i = STAR_COLORS.findIndex(c => c.key === colorKey);
  return i < 0 ? 0 : LEVELS - i;
}

export const initialCharge = () => null;

/** Charge pierces a shield when its level is >= the shield's level (and a charge exists). */
export const canPierce = (chargeKey, shieldKey) =>
  chargeLevel(chargeKey) > 0 && chargeLevel(chargeKey) >= chargeLevel(shieldKey);

/** Colors that pierce the shield, hottest first. */
export const piercingColors = shieldKey => STAR_COLORS.filter(c => canPierce(c.key, shieldKey)).map(c => c.key);

/** Weighted draw from DRONE_SHIELDS[diff]; rng in [0,1). */
export function pickShieldColor(diffKey, rng = Math.random) {
  const table = Object.entries(DRONE_SHIELDS[getDifficulty(diffKey).key]);
  let r = rng();
  for (const [key, w] of table) {
    if (r < w) return key;
    r -= w;
  }
  return table[table.length - 1][0];
}

/** Boss armor color of a stage (1..3). */
export const bossArmorColor = (stage, diffKey) => BOSS_ARMOR[getDifficulty(diffKey).key][stage - 1];

/** One beam hit on a shielded enemy: pierce costs 1 hp. */
export function resolveBeamOnEnemy({ charge, shieldKey, hp }) {
  if (shieldKey && !canPierce(charge, shieldKey)) return { pierced: false, hp, down: false };
  const next = Math.max(0, hp - 1);
  return { pierced: true, hp: next, down: next === 0 };
}

/**
 * What the engine does with a beam-vs-enemy result. keepAlive = the scene's onEnemyPierced hook returned true.
 * 'blocked' | 'pierced' (alive, hp lowered) | 'down' (explode + release + onEnemyDown) | 'kept' (hp 0 but the scene keeps it).
 */
export function enemyHitOutcome({ res, keepAlive }) {
  if (!res.pierced) return 'blocked';
  if (!res.down) return 'pierced';
  return keepAlive ? 'kept' : 'down';
}
