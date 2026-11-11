// Mission 3 drones (pure): wave layout, enemy shots, and which charge colors pierce what is on screen.
import { speedFor, canLaunch, aimVelocity } from './speed.js';
import { chargeLevel, piercingColors } from './charge.js';
import { DRONE_MUZZLE_DY } from '../config/balance.js';

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
 * One drone shot: { vx, vy, y } (y = launch point, drone.y + muzzleDy) or null when the ship is too close to react
 * from that launch point. Easy / warm-up / no-aim shoot straight down.
 */
export function droneShot({ drone, ship, diffKey, tier, aimAllowed, warmup, muzzleDy = DRONE_MUZZLE_DY, rng = Math.random }) {
  const speed = speedFor('hazard', diffKey, tier, rng);
  const from = { x: drone.x, y: drone.y + muzzleDy };
  if (!canLaunch({ fromY: from.y, shipY: ship.y, speedPxS: speed, category: 'hazard', diffKey })) return null;
  if (diffKey === 'easy' || warmup || !aimAllowed) return { vx: 0, vy: speed, y: from.y };
  return { ...aimVelocity(from, ship, speed), y: from.y };
}

/** Star colors that pierce every shield on screen (set by the highest one); no drones -> what pierces white. */
export function neededChargeColors(shieldKeys) {
  const keys = (shieldKeys ?? []).filter(Boolean);
  if (!keys.length) return piercingColors('white');
  const top = keys.reduce((a, b) => (chargeLevel(b) > chargeLevel(a) ? b : a));
  return piercingColors(top);
}
