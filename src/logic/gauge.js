import { STAR_COLORS } from './temperature.js';

/**
 * Star gauge: which colors are filled. hitsPerColor (m2 normal/hard: 2, M2_HITS_PER_COLOR) = correct hits a color needs before its
 * cell fills; between the first hit and the last the color is "partial". Prefilled colors are full.
 */
export class StarGauge {
  constructor(prefilled = [], hitsPerColor = 1) {
    this.hitsPerColor = Math.max(1, hitsPerColor);
    this._keys = new Set(prefilled);
    this._hits = new Map(); // colorKey -> hits so far (only for colors not yet full)
  }
  /** One correct hit of `key`. true = the gauge changed (a step closer or newly full), false = already full. */
  fill(key) {
    if (this._keys.has(key)) return false;
    const n = (this._hits.get(key) ?? 0) + 1;
    if (n >= this.hitsPerColor) {
      this._hits.delete(key);
      this._keys.add(key);
    } else {
      this._hits.set(key, n);
    }
    return true;
  }
  has(key) {
    return this._keys.has(key);
  }
  filledKeys() {
    return STAR_COLORS.filter(c => this._keys.has(c.key)).map(c => c.key);
  }
  /** Colors hit at least once but not full yet, in rank order. */
  partialKeys() {
    return STAR_COLORS.filter(c => this._hits.has(c.key)).map(c => c.key);
  }
  /** Correct hits still needed to fill every color in `keys`. */
  remainingHits(keys) {
    return keys.reduce((a, k) => a + (this._keys.has(k) ? 0 : this.hitsPerColor - (this._hits.get(k) ?? 0)), 0);
  }
  isComplete(keys = STAR_COLORS.map(c => c.key)) {
    return keys.every(k => this._keys.has(k));
  }
}
