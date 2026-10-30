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
