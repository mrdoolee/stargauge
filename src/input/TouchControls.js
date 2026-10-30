// Touch controls: fixed virtual joystick bottom-left (left thumb) steers, fire button bottom-right
// (right thumb) shoots. Both can be used at the same time (multitouch). No drag-anywhere steering.
//
// No static Phaser import: the pure parts (joystickVector, joystickLayout, fireButtonRect,
// classifyPointer, controlsTop, shipMaxY, stepShip, createPointerRouter) and the TouchControls
// wrapper are unit-tested in Node.
//
// Hit areas (deliberately a bit larger than what is drawn — 13-14-year-old thumbs miss small targets):
// - joystick: a CIRCLE of radius ringRadius x JOYSTICK_HIT_SCALE (1.3 → 130 px around a 100 px ring);
// - fire: the button's BOUNDING RECT (inclusive edges), so its corners outside the circle still count.
// The two never overlap (the joystick hit circle ends at x 258, the fire rect starts at x 542).

import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import {
  MAX_DT_MS,
  FIRE_BUTTON_DIAMETER,
  FIRE_BUTTON_MARGIN,
  JOYSTICK_DIAMETER,
  JOYSTICK_MARGIN,
  JOYSTICK_DEAD_ZONE,
  JOYSTICK_HIT_SCALE,
  SHIP_CONTROL_CLEARANCE,
  SHIP_MAX_SPEED,
} from '../config/balance.js';

const ZERO = Object.freeze({ x: 0, y: 0 });
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Stick offset (dx, dy from the ring centre, px) → movement vector of length 0..1.
 * Radial dead zone: |d| <= deadZone * radius reads as 0; beyond it the length ramps linearly from 0
 * to 1 at the rim (so a small push past the dead zone is a slow move, not a jump), and anything past
 * the rim is clamped to 1. The direction is always that of (dx, dy).
 */
export function joystickVector(dx, dy, radius, deadZone = JOYSTICK_DEAD_ZONE) {
  const dist = Math.hypot(dx, dy);
  if (!(radius > 0) || dist === 0) return { x: 0, y: 0 };
  const m = dist / radius;
  if (m <= deadZone) return { x: 0, y: 0 };
  const k = Math.min(1, (m - deadZone) / (1 - deadZone)) / dist;
  return { x: dx * k, y: dy * k };
}

/** Bottom-left joystick: ring centre, drawn radius and (larger) touch radius, in game coordinates. */
export function joystickLayout({
  height = GAME_HEIGHT,
  diameter = JOYSTICK_DIAMETER,
  margin = JOYSTICK_MARGIN,
  hitScale = JOYSTICK_HIT_SCALE,
} = {}) {
  const radius = diameter / 2;
  return { cx: margin + radius, cy: height - margin - radius, radius, hitRadius: radius * hitScale };
}

/** Bottom-right fire button rect {x,y,w,h} in game coordinates. */
export function fireButtonRect({
  width = GAME_WIDTH,
  height = GAME_HEIGHT,
  diameter = FIRE_BUTTON_DIAMETER,
  margin = FIRE_BUTTON_MARGIN,
} = {}) {
  return { x: width - margin - diameter, y: height - margin - diameter, w: diameter, h: diameter };
}

/** Which control a pointer going down at (x, y) belongs to. @returns {'joystick'|'fire'|'none'} */
export function classifyPointer(x, y, { joystick, fireRect }) {
  const r = fireRect;
  if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return 'fire';
  if (Math.hypot(x - joystick.cx, y - joystick.cy) <= joystick.hitRadius) return 'joystick';
  return 'none';
}

/** y of the top of the controls area: the higher (smaller y) of the two TOUCH areas. */
export function controlsTop({ joystick = joystickLayout(), fireRect = fireButtonRect() } = {}) {
  return Math.min(joystick.cy - joystick.hitRadius, fireRect.y);
}

/**
 * Lowest allowed ship CENTRE y: the ship's whole sprite (centre + shipHalfHeight) stays at least
 * `clearance` px above the controls, so it never comes down into the thumbs' area.
 * Defaults: min(1152 - 130, 1102) - 24 - 38 = 960.
 */
export function shipMaxY({
  joystick = joystickLayout(),
  fireRect = fireButtonRect(),
  clearance = SHIP_CONTROL_CLEARANCE,
  shipHalfHeight,
} = {}) {
  return controlsTop({ joystick, fireRect }) - clearance - shipHalfHeight;
}

/**
 * One frame of ship movement: position + vector * speed * dt, clamped to bounds {minX,maxX,minY,maxY}.
 * dt is capped at MAX_DT_MS so a long frame (tab return) cannot fling the ship.
 */
export function stepShip(pos, vector, dtMs, { speed = SHIP_MAX_SPEED, bounds, maxDtMs = MAX_DT_MS }) {
  const step = (speed * Math.min(Math.max(dtMs, 0), maxDtMs)) / 1000;
  return {
    x: clamp(pos.x + vector.x * step, bounds.minX, bounds.maxX),
    y: clamp(pos.y + vector.y * step, bounds.minY, bounds.maxY),
  };
}

/**
 * Pure pointer-ownership state machine. Each pointer belongs to the control it FIRST pressed,
 * until it lifts:
 * - fire: emits exactly one {type:'fire'} on the down edge; its moves are ignored (sliding onto the
 *   joystick never steers). Lifting it emits {type:'fire-end'}.
 * - joystick: the first pointer down in the joystick hit circle owns the stick and emits
 *   {type:'stick', dx, dy, x, y} (offset from the ring centre + joystickVector) on down and every
 *   move — also when it slides outside the circle (vector length stays 1). Lifting/losing it emits
 *   {type:'stick-end'}. A second pointer on the joystick while it is held is ignored.
 * - anywhere else: ignored entirely (no move, no shot), even if it later slides onto a control.
 */
export function createPointerRouter({ joystick, fireRect, deadZone = JOYSTICK_DEAD_ZONE }) {
  let stickId = null;
  const firePointers = new Set();

  const stick = (x, y) => {
    const dx = x - joystick.cx;
    const dy = y - joystick.cy;
    const v = joystickVector(dx, dy, joystick.radius, deadZone);
    return { type: 'stick', dx, dy, x: v.x, y: v.y };
  };

  const release = id => {
    const actions = [];
    if (firePointers.delete(id)) actions.push({ type: 'fire-end' });
    if (id !== null && id === stickId) {
      stickId = null;
      actions.push({ type: 'stick-end' });
    }
    return actions;
  };

  return {
    get stickId() {
      return stickId;
    },
    get firePressed() {
      return firePointers.size > 0;
    },
    firePointerIds: () => [...firePointers],
    down(id, x, y) {
      // A down on an id we still track means its up was lost: start clean.
      const actions = release(id);
      const kind = classifyPointer(x, y, { joystick, fireRect });
      if (kind === 'fire') {
        firePointers.add(id);
        actions.push({ type: 'fire' });
      } else if (kind === 'joystick' && stickId === null) {
        stickId = id;
        actions.push(stick(x, y));
      }
      return actions;
    },
    move(id, x, y) {
      return id !== null && id === stickId ? [stick(x, y)] : [];
    },
    up(id) {
      return release(id);
    },
    cancelAll() {
      const actions = [];
      for (const id of [...firePointers]) actions.push(...release(id));
      actions.push(...release(stickId));
      return actions;
    },
  };
}

/**
 * Phaser wrapper around the router.
 *   const c = new TouchControls(scene, { joystick, fireRect, deadZone });
 *   c.on('fire', fn, ctx)        // once per press of the fire button
 *   c.on('fire-state', fn, ctx)  // fn(pressed: boolean) when the fire button becomes held / released
 *   c.vector                     // {x, y}, length 0..1 — ship velocity = vector * SHIP_MAX_SPEED
 *   c.knob                       // {x, y} knob offset from the ring centre (thumb, clamped to the ring)
 *   c.isSteering, c.firePressed
 *   c.update()                   // call every frame: releases pointers that are no longer down
 *   c.cancel()                   // forget all pointers (pause, restart, tab switch)
 * Listeners are removed on scene shutdown (or destroy()). Does not call addPointer:
 * main.js sets input.activePointers = 3.
 */
export class TouchControls {
  constructor(scene, { joystick = joystickLayout(), fireRect = fireButtonRect(), deadZone = JOYSTICK_DEAD_ZONE } = {}) {
    this.scene = scene;
    this.joystick = joystick;
    this.fireRect = fireRect;
    this.router = createPointerRouter({ joystick, fireRect, deadZone });
    this.vector = ZERO;
    this.knob = ZERO;
    this.isSteering = false;
    this.firePressed = false;
    this._handlers = new Map();

    const input = scene.input;
    this._bindings = [
      [input, 'pointerdown', p => this._apply(this.router.down(p.id, p.x, p.y))],
      [input, 'pointermove', p => this._apply(this.router.move(p.id, p.x, p.y))],
      [input, 'pointerup', p => this._apply(this.router.up(p.id))],
      [input, 'pointerupoutside', p => this._apply(this.router.up(p.id))],
      [input, 'gameout', () => this.cancel()],
      [scene.game.events, 'blur', () => this.cancel()],
      [scene.game.events, 'hidden', () => this.cancel()],
      // A paused/sleeping scene gets no input, so an up during the pause would be lost.
      [scene.events, 'pause', () => this.cancel()],
      [scene.events, 'sleep', () => this.cancel()],
      [scene.events, 'shutdown', () => this.destroy()],
    ];
    for (const [em, ev, fn] of this._bindings) em.on(ev, fn, this);
  }

  on(event, fn, ctx) {
    if (!this._handlers.has(event)) this._handlers.set(event, []);
    this._handlers.get(event).push({ fn, ctx });
    return this;
  }

  _emit(event, ...args) {
    for (const h of this._handlers.get(event) ?? []) h.fn.apply(h.ctx, args);
  }

  _apply(actions) {
    for (const a of actions) {
      if (a.type === 'fire') this._emit('fire');
      else if (a.type === 'stick') {
        this.isSteering = true;
        this.vector = { x: a.x, y: a.y };
        const d = Math.hypot(a.dx, a.dy);
        const k = d > this.joystick.radius ? this.joystick.radius / d : 1;
        this.knob = { x: a.dx * k, y: a.dy * k };
      } else if (a.type === 'stick-end') {
        this.isSteering = false;
        this.vector = ZERO;
        this.knob = ZERO;
      }
    }
    const pressed = this.router.firePressed;
    if (pressed !== this.firePressed) {
      this.firePressed = pressed;
      this._emit('fire-state', pressed);
    }
  }

  /** Safety net: release any held pointer whose up was swallowed (e.g. by the HUD scene on top). */
  update() {
    const ids = this.router.firePointerIds();
    if (this.router.stickId !== null) ids.push(this.router.stickId);
    if (ids.length === 0) return;
    const pointers = this.scene.input.manager?.pointers ?? [];
    for (const id of ids) {
      const p = pointers.find(q => q.id === id);
      if (!p || !p.isDown) this._apply(this.router.up(id));
    }
  }

  cancel() {
    this._apply(this.router.cancelAll());
  }

  destroy() {
    if (!this._bindings) return;
    for (const [em, ev, fn] of this._bindings) em.off(ev, fn, this);
    this._bindings = null;
    this._handlers.clear();
  }
}
