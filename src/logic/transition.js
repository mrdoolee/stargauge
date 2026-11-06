// Stage transition: the field is cleared (fade), then a centre banner is shown, then play continues.
// Pure and clock-free: the scene feeds its (capped) update dt, so a paused scene never advances it.
import { TRANSITION_CLEAR_MS, TRANSITION_BANNER_MS } from '../config/balance.js';

/** What happens when a phase is done. Heat-full wins over everything. */
export function nextAfterPhaseDone({ heatFull, hasNextPhase }) {
  if (heatFull) return 'restart';
  return hasNextPhase ? 'transition' : 'complete';
}

/** Mutating step (no allocation; the scene calls this every frame). state = { step: 'clear'|'banner'|'done', ms }. */
export function advanceTransition(state, dtMs) {
  if (state.step === 'done') return state;
  state.ms += dtMs;
  if (state.step === 'clear' && state.ms >= TRANSITION_CLEAR_MS) {
    state.ms -= TRANSITION_CLEAR_MS;
    state.step = 'banner';
  }
  if (state.step === 'banner' && state.ms >= TRANSITION_BANNER_MS) {
    state.ms -= TRANSITION_BANNER_MS;
    state.step = 'done';
  }
  return state;
}

/** Pure version of advanceTransition. */
export function transitionStep(state, dtMs) {
  return advanceTransition({ step: state.step, ms: state.ms }, dtMs);
}

/** Split one banner line around the emphasis word -> [{ text, emph }]. */
export function splitEmphasis(line, emphasis) {
  const i = emphasis ? line.indexOf(emphasis) : -1;
  if (i < 0) return [{ text: line, emph: false }];
  const out = [];
  if (i > 0) out.push({ text: line.slice(0, i), emph: false });
  out.push({ text: emphasis, emph: true });
  if (i + emphasis.length < line.length) out.push({ text: line.slice(i + emphasis.length), emph: false });
  return out;
}
