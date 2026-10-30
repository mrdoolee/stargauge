import { STAR_COLORS } from './temperature.js';

export class StarGauge {
  constructor(prefilled = []) {
    this._keys = new Set(prefilled);
  }
  fill(key) {
    if (this._keys.has(key)) return false;
    this._keys.add(key);
    return true;
  }
  has(key) {
    return this._keys.has(key);
  }
  filledKeys() {
    return STAR_COLORS.filter(c => this._keys.has(c.key)).map(c => c.key);
  }
  isComplete(keys = STAR_COLORS.map(c => c.key)) {
    return keys.every(k => this._keys.has(k));
  }
}
