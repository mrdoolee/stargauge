// Star-charged beam and shield rules (pure). Charge level = star color temperature step (blue 7 ... red 1).
import { STAR_COLORS } from './temperature.js';
import { getDifficulty } from './difficulty.js';
import { DRONE_SHIELDS, BOSS_ARMOR, HUD_BAND_BOTTOM, CHARGE_LOST_ON_SHIP_HIT } from '../config/balance.js';

const LEVELS = STAR_COLORS.length;

/** 0 for null / unknown, else 7 - hottest-first index. */
export function chargeLevel(colorKey) {
  const i = STAR_COLORS.findIndex(c => c.key === colorKey);
  return i < 0 ? 0 : LEVELS - i;
}

export const initialCharge = () => null;

/** Charge after the ship is hit: dropped (null) in a charge-mode stage on difficulties with CHARGE_LOST_ON_SHIP_HIT, else kept. */
export const chargeAfterShipHit = ({ charge, chargeMode, diffKey }) =>
  (chargeMode && CHARGE_LOST_ON_SHIP_HIT[getDifficulty(diffKey).key] ? null : charge ?? null);

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

/**
 * Damage of one beam hit: 0 = bounced; unshielded = unit; else unit + (beam level - shield level) when it pierces.
 * unit 1 (drones): each hotter step adds a whole same-color hit. The boss uses BOSS_DAMAGE_UNIT (3): a same-color hit does 3 and
 * each hotter step adds 1, so hotter is still stronger but a blue charge no longer ends a stage in a few shots.
 */
export function beamDamage(chargeKey, shieldKey, unit = 1) {
  if (!shieldKey) return unit;
  if (!canPierce(chargeKey, shieldKey)) return 0;
  return unit + (chargeLevel(chargeKey) - chargeLevel(shieldKey));
}

/** Colors the needed-color guarantee brings in for this shield: the piercing colors without blue, unless only blue pierces. */
export function guaranteeColors(shieldKey) {
  const all = piercingColors(shieldKey);
  const notBlue = all.filter(c => c !== 'blue');
  return notBlue.length > 0 ? notBlue : all;
}

/** One beam hit on an enemy: hp drops by beamDamage (never below 0). unit = the enemy's damage unit (1, boss BOSS_DAMAGE_UNIT). */
export function resolveBeamOnEnemy({ charge, shieldKey, hp, unit = 1 }) {
  const damage = beamDamage(charge, shieldKey, unit);
  if (damage === 0) return { pierced: false, hp, down: false, damage: 0 };
  const next = Math.max(0, hp - damage);
  return { pierced: true, hp: next, down: next === 0, damage };
}

/** Hits needed to bring hp down with this charge against this shield (Infinity = cannot pierce). */
export function hitsToDown(chargeKey, shieldKey, hp, unit = 1) {
  const d = beamDamage(chargeKey, shieldKey, unit);
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
export const bounceCounts = ({ beamKey, firedAtMs, shieldChangedAtMs, optionalTarget = false }) =>
  !optionalTarget && !!beamKey && firedAtMs >= shieldChangedAtMs;
