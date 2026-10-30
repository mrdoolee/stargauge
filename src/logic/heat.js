import { HEAT_MAX, COOL_PER_SEC, MAX_DT_MS, STAR_HEAT, FURNACE_HEAT, ASTEROID_HEAT } from '../config/balance.js';

export function heatOnCollision(kind, key) {
  if (kind === 'asteroid') return ASTEROID_HEAT;
  const table = kind === 'star' ? STAR_HEAT : kind === 'furnace' ? FURNACE_HEAT : null;
  if (!table) throw new Error(`Unknown collision kind: ${kind}`);
  if (!Object.hasOwn(table, key)) throw new Error(`Unknown ${kind} color key: ${key}`);
  return table[key];
}

export class HeatMeter {
  constructor({ max = HEAT_MAX, coolPerSec = COOL_PER_SEC } = {}) {
    this.max = max;
    this.coolPerSec = coolPerSec;
    this.value = 0;
  }
  get ratio() { return this.value / this.max; }
  add(n) { this.value = Math.min(this.max, Math.max(0, this.value + n)); }
  update(dtMs) {
    const dt = Math.min(dtMs, MAX_DT_MS);
    this.value = Math.max(0, this.value - (this.coolPerSec * dt) / 1000);
  }
  isFull() { return this.value >= this.max; }
  reset() { this.value = 0; }
}
