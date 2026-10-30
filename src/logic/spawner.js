import { MAX_DT_MS, SPAWN_NEEDED_GUARANTEE } from '../config/balance.js';

function pick(list, rng) {
  const i = Math.min(list.length - 1, Math.floor(rng() * list.length));
  return list[i];
}

export function pickSpawnColor({ needed, all, sinceNeeded, rng }) {
  if (sinceNeeded >= SPAWN_NEEDED_GUARANTEE && needed.length > 0) return pick(needed, rng);
  return pick(all, rng);
}

export class Spawner {
  constructor({ intervalMs }) {
    this.intervalMs = intervalMs;
    this.acc = 0;
  }
  update(dtMs) {
    this.acc += Math.min(dtMs, MAX_DT_MS);
    if (this.acc >= this.intervalMs) {
      this.acc = this.intervalMs > 0 ? this.acc % this.intervalMs : 0;
      return 1;
    }
    return 0;
  }
}

/**
 * Random spawn x in [min, max] that is at least minGap from prevX (null = no previous spawn), so two
 * consecutive stars never fall on top of each other. Uniform over the allowed part of the range.
 * If nothing is far enough (tiny range), returns the edge farthest from prevX.
 */
export function spawnXAwayFrom(prevX, { min, max, minGap, rng = Math.random }) {
  if (prevX === null || prevX === undefined) return min + rng() * (max - min);
  const left = Math.max(0, prevX - minGap - min); // length of [min, prevX - minGap]
  const right = Math.max(0, max - (prevX + minGap)); // length of [prevX + minGap, max]
  const total = left + right;
  if (total <= 0) {
    const leftOk = prevX - min >= minGap;
    const rightOk = max - prevX >= minGap;
    if (leftOk && !rightOk) return min;
    if (rightOk && !leftOk) return max;
    return prevX - min > max - prevX ? min : max;
  }
  const r = rng() * total;
  return r < left ? min + r : prevX + minGap + (r - left);
}
