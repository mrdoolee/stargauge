// Rank (tension) model (pure). value = start - mercy + survivalSteps + correct * RANK_PER_CORRECT.
// Easy is fixed: tier 0 and no aiming regardless of value.
import {
  RANK_START, RANK_SURVIVAL, RANK_PER_CORRECT, RANK_MERCY_PER_RESTART,
  RANK_MERCY_MAX_RESTARTS, RANK_TIER_AT, RANK_AIM_MIN,
} from '../config/balance.js';

export function createRank({ diffKey = 'normal', restarts = 0 } = {}) {
  const key = typeof diffKey === 'string' && Object.hasOwn(RANK_START, diffKey) ? diffKey : 'normal';
  const mercy = Math.min(Math.max(0, restarts | 0), RANK_MERCY_MAX_RESTARTS) * RANK_MERCY_PER_RESTART;
  const base = RANK_START[key] - mercy;
  const isEasy = key === 'easy';
  let elapsedMs = 0;
  let correct = 0;

  const steps = () => {
    if (elapsedMs < RANK_SURVIVAL.firstStepMs) return 0;
    const n = 1 + Math.floor((elapsedMs - RANK_SURVIVAL.firstStepMs) / RANK_SURVIVAL.stepMs);
    return Math.min(n, RANK_SURVIVAL.maxSteps);
  };

  return {
    get value() { return base + steps() + correct * RANK_PER_CORRECT; },
    get tier() {
      if (isEasy) return 0;
      const v = this.value;
      let t = 0;
      RANK_TIER_AT.forEach((at, i) => { if (v >= at) t = i; });
      return t;
    },
    get aimAllowed() { return !isEasy && this.value >= RANK_AIM_MIN; },
    update(dtMs) { if (dtMs > 0) elapsedMs += dtMs; },
    onCorrect() { correct += 1; },
  };
}
