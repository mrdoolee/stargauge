// Instruction-strip state (HUD): the mission instruction plus an optional timed message that
// temporarily replaces it. Pure: HUD feeds events and the current time, nothing here reads a clock.
import { TOAST_MS, STRIP_HOLD_MS } from '../config/balance.js';

export function initialStrip() {
  return { instruction: '', message: null };
}

/**
 * Events: { type: 'instruction', text } | { type: 'message', text, tone, priority?, nowMs }
 *       | { type: 'tick', nowMs } | { type: 'clear' }.
 * Returns the SAME state object when nothing changed (callers can compare by identity).
 */
export function stripReducer(state, event) {
  switch (event.type) {
    case 'instruction':
      return state.instruction === event.text ? state : { ...state, instruction: event.text };
    case 'message': {
      const cur = state.message;
      const priority = !!event.priority;
      if (cur && cur.priority && !priority && event.nowMs < cur.holdUntil) return state;
      return {
        ...state,
        message: {
          text: event.text,
          tone: event.tone ?? 'info',
          until: event.nowMs + TOAST_MS,
          holdUntil: priority ? event.nowMs + STRIP_HOLD_MS : 0,
          priority,
        },
      };
    }
    case 'tick':
      return state.message && event.nowMs >= state.message.until ? { ...state, message: null } : state;
    case 'clear':
      return state.message ? { ...state, message: null } : state;
    default:
      return state;
  }
}

export function stripText(state) {
  const m = state.message;
  return m ? { text: m.text, tone: m.tone } : { text: state.instruction, tone: 'normal' };
}
