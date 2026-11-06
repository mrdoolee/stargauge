// Star-charged beam and shield rules (pure). Charge level = star color temperature step (blue 7 ... red 1).
import { STAR_COLORS } from './temperature.js';
import { getDifficulty } from './difficulty.js';
import { DRONE_SHIELDS, BOSS_ARMOR, HUD_BAND_BOTTOM } from '../config/balance.js';

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

/** Damage of one beam hit: 0 = bounced; unshielded = 1; else 1 + (beam level - shield level) when it pierces. */
export function beamDamage(chargeKey, shieldKey) {
  if (!shieldKey) return 1;
  if (!canPierce(chargeKey, shieldKey)) return 0;
  return 1 + (chargeLevel(chargeKey) - chargeLevel(shieldKey));
}

/** One beam hit on an enemy: hp drops by beamDamage (never below 0). */
export function resolveBeamOnEnemy({ charge, shieldKey, hp }) {
  const damage = beamDamage(charge, shieldKey);
  if (damage === 0) return { pierced: false, hp, down: false, damage: 0 };
  const next = Math.max(0, hp - damage);
  return { pierced: true, hp: next, down: next === 0, damage };
}

/** Hits needed to bring hp down with this charge against this shield (Infinity = cannot pierce). */
export function hitsToDown(chargeKey, shieldKey, hp) {
  const d = beamDamage(chargeKey, shieldKey);
  return d === 0 ? Infinity : Math.ceil(hp / d);
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

/** Beam vs star/enemy contact: in charge mode only objects visible below the HUD band can be hit (m1/m2: always). */
export const beamCanTouch = ({ chargeMode, y }) => !chargeMode || y > HUD_BAND_BOTTOM;

/**
 * A bounce counts as a wrong shot only if the beam was charged when fired and was fired no earlier than the
 * enemy's current shield was set (a beam already in flight when the armor changed is not the student's mistake).
 */
export const bounceCounts = ({ beamKey, firedAtMs, shieldChangedAtMs }) =>
  !!beamKey && firedAtMs >= shieldChangedAtMs;
