// Touch controls: drag anywhere to steer, tap the fire button to shoot.
//
// No static Phaser import: the pure parts (classifyPointer, createPointerRouter,
// fireButtonRect, followFactor) and the TouchControls wrapper are unit-tested in Node.
//
// Classification uses the fire button's BOUNDING RECT (inclusive edges), not the
// circle. The corners outside the circle still count as "fire": for 13-14-year-old
// thumbs a slightly larger target is kinder, and a touch there is never meant as a
// steer anyway.

import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import {
  FIRE_BUTTON_DIAMETER,
  FIRE_BUTTON_MARGIN,
  SHIP_OFFSET_Y,
  SHIP_FOLLOW_REMAIN_PER_SEC,
  SHIP_BOUNDS,
} from '../config/balance.js';

/** @returns {'fire'|'move'} */
export function classifyPointer(x, y, fireRect) {
  const r = fireRect;
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h ? 'fire' : 'move';
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

/** Fraction of the remaining gap to close this frame; frame-rate independent. */
export function followFactor(dtSec, remainPerSec = SHIP_FOLLOW_REMAIN_PER_SEC) {
  if (dtSec <= 0) return 0;
  return 1 - Math.pow(remainPerSec, dtSec);
}

/**
 * Pure pointer-ownership state machine.
 * - A pointer that goes down inside fireRect is a FIRE pointer until it lifts: it emits
 *   exactly one {type:'fire'} on the down edge and its moves are ignored.
 * - The first non-fire pointer owns the drag; other non-fire pointers are ignored while
 *   it is held (no hand-over when it lifts — a new touch is needed).
 * Every method returns an array of actions: 'drag-start' {x,y} | 'drag' {x,y} | 'drag-end' | 'fire'.
 */
export function createPointerRouter({ fireRect }) {
  let dragId = null;
  const firePointers = new Set();

  const release = id => {
    firePointers.delete(id);
    if (id !== null && id === dragId) {
      dragId = null;
      return [{ type: 'drag-end' }];
    }
    return [];
  };

  return {
    get dragId() {
      return dragId;
    },
    isFirePointer: id => firePointers.has(id),
    down(id, x, y) {
      // A down on an id we still track means its up was lost: start clean.
      const actions = release(id);
      if (classifyPointer(x, y, fireRect) === 'fire') {
        firePointers.add(id);
        actions.push({ type: 'fire' });
      } else if (dragId === null) {
        dragId = id;
        actions.push({ type: 'drag-start', x, y });
      }
      return actions;
    },
    move(id, x, y) {
      return id === dragId ? [{ type: 'drag', x, y }] : [];
    },
    up(id) {
      return release(id);
    },
    cancelAll() {
      firePointers.clear();
      return release(dragId);
    },
  };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Phaser wrapper around the router.
 *   const c = new TouchControls(scene, { fireRect, offsetY, bounds });
 *   c.on('fire', fn, ctx)     // once per press of the fire button
 *   c.targetX / c.targetY     // where the ship should go (finger - offsetY, clamped); null before the first drag
 *   c.isDragging
 *   c.update()                // call every frame: releases a drag whose pointer is no longer down
 *   c.cancel()                // forget all pointers (pause, restart, tab switch)
 * Listeners are removed on scene shutdown (or destroy()). Does not call addPointer:
 * main.js sets input.activePointers = 3.
 */
export class TouchControls {
  constructor(scene, { fireRect = fireButtonRect(), offsetY = SHIP_OFFSET_Y, bounds = SHIP_BOUNDS } = {}) {
    this.scene = scene;
    this.fireRect = fireRect;
    this.offsetY = offsetY;
    this.bounds = bounds;
    this.router = createPointerRouter({ fireRect });
    this.targetX = null;
    this.targetY = null;
    this.isDragging = false;
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

  _emit(event) {
    for (const h of this._handlers.get(event) ?? []) h.fn.call(h.ctx);
  }

  _apply(actions) {
    for (const a of actions) {
      if (a.type === 'fire') this._emit('fire');
      else if (a.type === 'drag-end') this.isDragging = false;
      else {
        this.isDragging = true;
        this.targetX = clamp(a.x, this.bounds.minX, this.bounds.maxX);
        this.targetY = clamp(a.y - this.offsetY, this.bounds.minY, this.bounds.maxY);
      }
    }
  }

  /** Safety net: if the drag pointer's up was swallowed (e.g. by the HUD scene on top), end the drag. */
  update() {
    const id = this.router.dragId;
    if (id === null) return;
    const pointers = this.scene.input.manager?.pointers ?? [];
    const p = pointers.find(q => q.id === id);
    if (!p || !p.isDown) this._apply(this.router.up(id));
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
