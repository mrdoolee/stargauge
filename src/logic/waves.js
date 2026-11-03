// WaveDirector (pure): turns rank (tension) + the formation library into a timed stream of spawn slots.
// Timeline: wait one gap -> pick + build a formation -> emit each slot when its delayMs has elapsed ->
// the next gap starts after the last slot. No Phaser imports.
import { createRank } from './rank.js';
import { pickFormation, buildFormation } from './formations.js';
import { WARMUP_MS, WARMUP_DENSITY, RANK_GAP_SHRINK } from '../config/balance.js';

const MAX_STEPS = 16; // guards against a zero gap looping within one update

export class WaveDirector {
  /** gapMs is already difficulty-scaled by the caller; the rank tier shrinks it further. */
  constructor({ diffKey = 'normal', restarts = 0, gapMs = 0, minX, maxX, rng = Math.random } = {}) {
    this._diffKey = diffKey;
    this._gapMs = Math.max(0, gapMs);
    this._minX = minX;
    this._maxX = maxX;
    this._rng = rng;
    this._rank = createRank({ diffKey, restarts });
    this._elapsed = 0;
    this._formCount = 0;
    this._prev = { id: null, side: null };
    this._form = null; // { slots, next, t, meta }
    this._gapLeft = this._effectiveGap();
  }

  get rank() { return this._rank; }

  onCorrect() { this._rank.onCorrect(); }

  _effectiveGap() {
    return this._gapMs * Math.max(0, 1 - RANK_GAP_SHRINK * this._rank.tier);
  }

  _startFormation() {
    const warmingUp = this._elapsed < WARMUP_MS;
    const aimAllowed = this._rank.aimAllowed && !warmingUp;
    const tier = this._rank.tier;
    const pick = pickFormation({
      prevId: this._prev.id, prevSide: this._prev.side, diffKey: this._diffKey, aimAllowed, rng: this._rng,
    });
    this._prev = pick;
    let count = 3 + Math.min(2, Math.floor(this._rng() * 3));
    if (warmingUp) count = Math.max(1, Math.ceil(count * WARMUP_DENSITY));
    const slots = buildFormation({ ...pick, count, minX: this._minX, maxX: this._maxX, rng: this._rng });
    slots.sort((a, b) => a.delayMs - b.delayMs);
    this._form = { slots, next: 0, t: 0, meta: { formationId: pick.id, tier, aimAllowed, formationIndex: this._formCount++, formationSize: slots.length } };
  }

  /** Advance dtMs; returns the SpawnSlots to spawn now (delay order). */
  update(dtMs) {
    const dt = dtMs > 0 ? dtMs : 0;
    this._rank.update(dt);
    this._elapsed += dt;
    const out = [];
    let remaining = dt;
    for (let step = 0; step < MAX_STEPS; step++) {
      if (!this._form) {
        if (remaining < this._gapLeft) { this._gapLeft -= remaining; break; }
        remaining -= this._gapLeft;
        this._startFormation();
      }
      const f = this._form;
      f.t += remaining;
      remaining = 0;
      while (f.next < f.slots.length && f.slots[f.next].delayMs <= f.t) {
        out.push({ ...f.slots[f.next], ...f.meta, slotIndex: f.next });
        f.next += 1;
      }
      if (f.next < f.slots.length) break;
      remaining = Math.max(0, f.t - f.slots[f.slots.length - 1].delayMs);
      this._form = null;
      this._gapLeft = this._effectiveGap();
      if (remaining <= 0 && this._gapLeft <= 0) break;
    }
    return out;
  }
}
