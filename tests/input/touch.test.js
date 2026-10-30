import { describe, it, expect } from 'vitest';
import {
  classifyPointer,
  createPointerRouter,
  fireButtonRect,
  followFactor,
  TouchControls,
} from '../../src/input/TouchControls.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../../src/config/game.js';
import {
  FIRE_BUTTON_DIAMETER,
  FIRE_BUTTON_MARGIN,
  SHIP_OFFSET_Y,
  BEAM_SPEED,
  BEAM_BODY_H,
} from '../../src/config/balance.js';

const RECT = { x: 552, y: 1112, w: 140, h: 140 };
const FIRE = [620, 1180]; // centre of RECT

describe('classifyPointer', () => {
  it('inside the fire rect (incl. edges) is fire', () => {
    expect(classifyPointer(620, 1180, RECT)).toBe('fire');
    expect(classifyPointer(552, 1112, RECT)).toBe('fire'); // top-left corner
    expect(classifyPointer(692, 1252, RECT)).toBe('fire'); // bottom-right corner
  });
  it('just outside the boundary is move', () => {
    expect(classifyPointer(551, 1180, RECT)).toBe('move'); // left
    expect(classifyPointer(693, 1180, RECT)).toBe('move'); // right
    expect(classifyPointer(620, 1111, RECT)).toBe('move'); // above
    expect(classifyPointer(620, 1253, RECT)).toBe('move'); // below
    expect(classifyPointer(100, 300, RECT)).toBe('move');
  });
});

describe('fire button + balance numbers', () => {
  it('rect sits bottom-right with the safe margin', () => {
    const r = fireButtonRect();
    expect(r).toEqual({ x: GAME_WIDTH - 28 - 140, y: GAME_HEIGHT - 28 - 140, w: 140, h: 140 });
  });
  it('meets the brief minimums', () => {
    expect(FIRE_BUTTON_DIAMETER).toBeGreaterThanOrEqual(120);
    expect(FIRE_BUTTON_MARGIN).toBeGreaterThanOrEqual(24);
    expect(BEAM_SPEED).toBeLessThanOrEqual(1400);
    expect(BEAM_BODY_H).toBeGreaterThanOrEqual(24);
    expect(SHIP_OFFSET_Y).toBe(140);
  });
});

describe('pointer router (multitouch ownership)', () => {
  const types = acts => acts.map(a => a.type);

  it('(a) drag, then tap fire: one shot and the drag keeps going', () => {
    const r = createPointerRouter({ fireRect: RECT });
    expect(r.down(1, 100, 600)).toEqual([{ type: 'drag-start', x: 100, y: 600 }]);
    expect(r.move(1, 120, 620)).toEqual([{ type: 'drag', x: 120, y: 620 }]);
    expect(r.down(2, ...FIRE)).toEqual([{ type: 'fire' }]);
    expect(r.move(1, 140, 640)).toEqual([{ type: 'drag', x: 140, y: 640 }]);
    expect(r.move(2, 622, 1182)).toEqual([]); // holding/rubbing fire: no auto-fire
    expect(r.up(2)).toEqual([]);
    expect(r.move(1, 160, 660)).toEqual([{ type: 'drag', x: 160, y: 660 }]);
    expect(r.dragId).toBe(1);
  });

  it('(b) a touch that starts on fire never moves the ship, even when slid off', () => {
    const r = createPointerRouter({ fireRect: RECT });
    expect(types(r.down(1, ...FIRE))).toEqual(['fire']);
    expect(r.move(1, 500, 1100)).toEqual([]);
    expect(r.move(1, 200, 400)).toEqual([]);
    expect(r.dragId).toBe(null);
    // another finger can still drag while fire is held
    expect(types(r.down(2, 300, 700))).toEqual(['drag-start']);
    expect(r.move(1, 300, 300)).toEqual([]);
    expect(r.up(1)).toEqual([]);
    expect(types(r.move(2, 310, 710))).toEqual(['drag']);
  });

  it('(c) lifting the drag finger while fire is held does not hand the ship to the fire finger', () => {
    const r = createPointerRouter({ fireRect: RECT });
    r.down(1, 100, 600);
    expect(types(r.down(2, ...FIRE))).toEqual(['fire']);
    expect(r.up(1)).toEqual([{ type: 'drag-end' }]);
    expect(r.move(2, 600, 1150)).toEqual([]);
    expect(r.move(2, 300, 300)).toEqual([]);
    expect(r.dragId).toBe(null);
    expect(r.up(2)).toEqual([]);
  });

  it('(d) a second non-fire finger while dragging is ignored', () => {
    const r = createPointerRouter({ fireRect: RECT });
    r.down(1, 100, 600);
    expect(r.down(2, 400, 400)).toEqual([]);
    expect(r.move(2, 410, 410)).toEqual([]);
    expect(r.up(2)).toEqual([]);
    expect(types(r.move(1, 110, 610))).toEqual(['drag']);
    expect(types(r.up(1))).toEqual(['drag-end']);
    // after the drag ends, a fresh finger takes over
    expect(types(r.down(3, 200, 200))).toEqual(['drag-start']);
  });

  it('one shot per press: only the down edge fires', () => {
    const r = createPointerRouter({ fireRect: RECT });
    const shots = [r.down(1, ...FIRE), r.move(1, ...FIRE), r.move(1, 600, 1150), r.up(1)]
      .flat()
      .filter(a => a.type === 'fire');
    expect(shots).toHaveLength(1);
    expect(types(r.down(1, ...FIRE))).toEqual(['fire']); // next press fires again
  });

  it('cancelAll ends the drag and forgets fire fingers', () => {
    const r = createPointerRouter({ fireRect: RECT });
    r.down(1, 100, 600);
    r.down(2, ...FIRE);
    expect(r.cancelAll()).toEqual([{ type: 'drag-end' }]);
    expect(r.dragId).toBe(null);
    expect(r.cancelAll()).toEqual([]);
    expect(types(r.down(4, 100, 100))).toEqual(['drag-start']);
  });

  it('a repeated down on the same id (missed up) starts clean', () => {
    const r = createPointerRouter({ fireRect: RECT });
    r.down(1, 100, 600);
    // the up for id 1 was lost; id 1 now goes down on the fire button
    expect(types(r.down(1, ...FIRE))).toEqual(['drag-end', 'fire']);
    expect(r.dragId).toBe(null);
    expect(r.move(1, 200, 200)).toEqual([]);
  });
});

describe('followFactor', () => {
  it('is frame-rate independent', () => {
    const k60 = followFactor(1 / 60);
    const twoSteps = 1 - (1 - k60) * (1 - k60);
    expect(followFactor(2 / 60)).toBeCloseTo(twoSteps, 10);
    expect(followFactor(0)).toBe(0);
    expect(followFactor(1)).toBeGreaterThan(0.99);
  });
});

// Minimal fakes for the Phaser-facing class.
function fakeEmitter() {
  const map = new Map();
  return {
    on(ev, fn, ctx) { (map.get(ev) ?? map.set(ev, []).get(ev)).push({ fn, ctx }); return this; },
    off(ev, fn, ctx) {
      const l = map.get(ev); if (!l) return this;
      map.set(ev, l.filter(h => !(h.fn === fn && (ctx === undefined || h.ctx === ctx)))); return this;
    },
    emit(ev, ...args) { for (const h of [...(map.get(ev) ?? [])]) h.fn.apply(h.ctx, args); },
    count(ev) { return (map.get(ev) ?? []).length; },
  };
}
function fakeScene() {
  const input = fakeEmitter();
  input.manager = { pointers: [] };
  return { input, events: fakeEmitter(), game: { events: fakeEmitter() } };
}
const ptr = (scene, id, x, y, isDown = true) => {
  let p = scene.input.manager.pointers.find(q => q.id === id);
  if (!p) { p = { id }; scene.input.manager.pointers.push(p); }
  Object.assign(p, { x, y, isDown });
  return p;
};

describe('TouchControls (Phaser-facing wrapper)', () => {
  const bounds = { minX: 40, maxX: 680, minY: 300, maxY: 1220 };

  it('targets finger minus offsetY, clamped to bounds, and fires once per press', () => {
    const s = fakeScene();
    const c = new TouchControls(s, { fireRect: RECT, offsetY: 140, bounds });
    let fired = 0;
    c.on('fire', () => fired++);
    s.input.emit('pointerdown', ptr(s, 1, 300, 800));
    expect(c.isDragging).toBe(true);
    expect([c.targetX, c.targetY]).toEqual([300, 660]);
    s.input.emit('pointermove', ptr(s, 1, 10, 350));
    expect([c.targetX, c.targetY]).toEqual([40, 300]);
    s.input.emit('pointerdown', ptr(s, 2, ...FIRE));
    s.input.emit('pointermove', ptr(s, 2, 300, 300));
    expect(fired).toBe(1);
    expect([c.targetX, c.targetY]).toEqual([40, 300]);
  });

  it('pointerupoutside, gameout, blur and a lost up all release the drag', () => {
    const s = fakeScene();
    const c = new TouchControls(s, { fireRect: RECT, offsetY: 140, bounds });
    for (const end of [
      () => s.input.emit('pointerupoutside', ptr(s, 1, 0, 0, false)),
      () => s.input.emit('gameout'),
      () => s.game.events.emit('blur'),
      () => s.game.events.emit('hidden'),
      () => s.events.emit('pause'),
      () => { ptr(s, 1, 300, 800, false); c.update(); }, // up swallowed by another scene
    ]) {
      s.input.emit('pointerdown', ptr(s, 1, 300, 800));
      expect(c.isDragging).toBe(true);
      end();
      expect(c.isDragging).toBe(false);
    }
  });

  it('destroy removes every listener it added', () => {
    const s = fakeScene();
    const c = new TouchControls(s, { fireRect: RECT, offsetY: 140, bounds });
    c.destroy();
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointerupoutside', 'gameout']) {
      expect(s.input.count(ev)).toBe(0);
    }
    for (const ev of ['blur', 'hidden']) expect(s.game.events.count(ev)).toBe(0);
    for (const ev of ['pause', 'sleep', 'shutdown']) expect(s.events.count(ev)).toBe(0);
  });
});
