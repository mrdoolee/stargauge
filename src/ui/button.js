// Shared tap-button behaviour (no Phaser import: the pure gate and the wiring are unit-tested in Node).
//
// Why: Phaser fires 'pointerup' on whatever object is under the finger, even when the press began
// somewhere else. A finger still held from the previous screen (steering in a mission, tapping
// "다음" on a card) would otherwise "press" the button that appears under it. A student must never
// be marked or moved on because of that.
//
// Rule: a button activates on pointerup only if
//   1) the SAME press (pointer id + its downTime) went down on this button, and
//   2) that down came at least `armMs` after the button appeared (or after rearm()).
//
//   armButton(gameObject, onActivate, { armMs, stopPropagation })  -> { rearm() }
//   onActivate(gameObject) is called once per completed press.

export const BUTTON_ARM_MS = 300;

const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Pure press tracker for one button.
 *   down(pointer, nowMs)        pointer = { id, downTime }
 *   up(pointer, nowMs) -> bool  true = activate
 *   rearm()                     restart the arm delay (e.g. an overlay re-opens) and forget any press
 */
export function createPressGate({ now = defaultNow, armMs = BUTTON_ARM_MS } = {}) {
  let armedAt = now() + armMs;
  let press = null; // { id, downTime } of the press that started on this button

  return {
    down(pointer, t = now()) {
      if (t < armedAt) {
        press = null;
        return;
      }
      press = { id: pointer?.id, downTime: pointer?.downTime };
    },
    up(pointer, t = now()) {
      const p = press;
      if (!p || p.id !== pointer?.id) return false; // another finger lifting: keep this press pending
      press = null;
      return t >= armedAt && p.downTime === pointer?.downTime;
    },
    rearm() {
      armedAt = now() + armMs;
      press = null;
    },
  };
}

/**
 * Wire a Phaser game object (Text, Rectangle, Zone, ...) as a tap button.
 * Makes it interactive (hand cursor) unless it already is. Returns { gate, rearm }.
 */
export function armButton(gameObject, onActivate, { armMs = BUTTON_ARM_MS, now = defaultNow, stopPropagation = false } = {}) {
  const gate = createPressGate({ now, armMs });
  if (!gameObject.input) gameObject.setInteractive({ useHandCursor: true });
  gameObject.on('pointerdown', (pointer, _x, _y, ev) => {
    if (stopPropagation) ev?.stopPropagation?.();
    gate.down(pointer, now());
  });
  gameObject.on('pointerup', (pointer, _x, _y, ev) => {
    if (stopPropagation) ev?.stopPropagation?.();
    if (gate.up(pointer, now())) onActivate(gameObject);
  });
  return { gate, rearm: () => gate.rearm() };
}
