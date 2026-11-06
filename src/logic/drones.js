// Mission 3 drones (pure): wave layout, enemy shots, and which charge colors pierce what is on screen.
import { cappedShotSpeed, aimVelocity } from './speed.js';
import { DRONE_MUZZLE_DY, DRONE_MIN_SHOT_SPEED } from '../config/balance.js';
import { chargeLevel, piercingColors } from './charge.js';

const MIN_GAP = 120; // px between drones of one wave
const MAX_COUNT = 3;
const STAGGER_MS = 450;

/** 1..3 drones with x in [minX, maxX], at least MIN_GAP apart; enterDelayMs staggers their entry. */
export function droneFormation({ count, minX, maxX, rng = Math.random }) {
  const n = Math.min(MAX_COUNT, Math.max(1, Math.trunc(count) || 1));
  const usable = (maxX - minX) - MIN_GAP * (n - 1);
  let xs;
  if (usable < 0) {
    xs = Array.from({ length: n }, (_, i) => minX + (n === 1 ? 0 : ((maxX - minX) * i) / (n - 1)));
  } else {
    const offs = Array.from({ length: n }, () => rng() * usable).sort((a, b) => a - b);
    xs = offs.map((u, i) => minX + u + MIN_GAP * i);
  }
  return xs.map((x, i) => ({ x, enterDelayMs: Math.round(i * STAGGER_MS + rng() * 150) }));
}

/**
 * One drone shot: { vx, vy }. Safe distance is measured from the real bullet spawn (drone.y + DRONE_MUZZLE_DY); when the ship is
 * close the speed is capped (reaction floor holds) instead of skipping. null only when even the minimum speed is unsafe.
 * Easy / warm-up / no-aim shoot straight down.
 */
export function droneShot({ drone, ship, diffKey, tier, aimAllowed, warmup, rng = Math.random, minSpeed = DRONE_MIN_SHOT_SPEED }) {
  const from = { x: drone.x, y: drone.y + DRONE_MUZZLE_DY };
  const speed = cappedShotSpeed({ fromY: from.y, shipY: ship.y, diffKey, tier, minSpeed, rng });
  if (speed === null) return null;
  if (diffKey === 'easy' || warmup || !aimAllowed) return { vx: 0, vy: speed };
  return aimVelocity(from, ship, speed);
}

/** Star colors that pierce every shield on screen (set by the highest one); no drones -> what pierces white. */
export function neededChargeColors(shieldKeys) {
  const keys = (shieldKeys ?? []).filter(Boolean);
  if (!keys.length) return piercingColors('white');
  const top = keys.reduce((a, b) => (chargeLevel(b) > chargeLevel(a) ? b : a));
  return piercingColors(top);
}
