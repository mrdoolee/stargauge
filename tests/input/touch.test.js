import { describe, it, expect } from 'vitest';
import {
  classifyPointer,
  createPointerRouter,
  fireButtonRect,
  joystickLayout,
  joystickVector,
  controlsTop,
  shipMaxY,
  stepShip,
  TouchControls,
} from '../../src/input/TouchControls.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../../src/config/game.js';
import {
  FIRE_BUTTON_DIAMETER,
  FIRE_BUTTON_MARGIN,
  JOYSTICK_DIAMETER,
  JOYSTICK_MARGIN,
  JOYSTICK_DEAD_ZONE,
  JOYSTICK_HIT_SCALE,
  CONTROLS_ALPHA,
  SHIP_MAX_SPEED,
  SHIP_CONTROL_CLEARANCE,
  SHIP_START_Y,
  SHIP_BOUNDS,
  BEAM_SPEED,
  BEAM_BODY_H,
} from '../../src/config/balance.js';

// Fixed layouts (same numbers as the defaults, written out so the tests read on their own).
const JOY = { cx: 128, cy: 1152, radius: 100, hitRadius: 130 };
const RECT = { x: 542, y: 1102, w: 150, h: 150 };
const FIRE = [617, 1177]; // centre of RECT
const DEAD = 0.12;
const len = v => Math.hypot(v.x, v.y);
const router = () => createPointerRouter({ joystick: JOY, fireRect: RECT, deadZone: DEAD });
const types = acts => acts.map(a => a.type);

describe('joystickVector', () => {
  it('is zero inside the dead zone (and at the centre)', () => {
    expect(len(joystickVector(0, 0, 100, DEAD))).toBe(0);
    expect(len(joystickVector(8, -8, 100, DEAD))).toBe(0); // |d| = 11.3 < 12
    expect(len(joystickVector(0, 12, 100, DEAD))).toBe(0); // exactly on the dead-zone edge
  });
  it('ramps from 0 at the dead-zone edge to 1 at the rim', () => {
    const half = joystickVector(56, 0, 100, DEAD); // (0.56 - 0.12) / 0.88 = 0.5
    expect(half.x).toBeCloseTo(0.5, 10);
    expect(half.y).toBeCloseTo(0, 10);
    expect(len(joystickVector(100, 0, 100, DEAD))).toBeCloseTo(1, 10);
    const a = len(joystickVector(30, 0, 100, DEAD));
    const b = len(joystickVector(60, 0, 100, DEAD));
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a); // pushed further = faster
  });
  it('clamps to length 1 outside the rim, keeping the direction', () => {
    const v = joystickVector(300, -400, 100, DEAD); // direction (0.6, -0.8)
    expect(len(v)).toBeCloseTo(1, 10);
    expect(v.x).toBeCloseTo(0.6, 10);
    expect(v.y).toBeCloseTo(-0.8, 10);
  });
  it('keeps the direction inside the rim too', () => {
    const v = joystickVector(-30, 40, 100, DEAD); // |d| = 50, direction (-0.6, 0.8)
    expect(v.x / len(v)).toBeCloseTo(-0.6, 10);
    expect(v.y / len(v)).toBeCloseTo(0.8, 10);
  });
});

describe('layout + balance numbers', () => {
  it('joystick sits bottom-left with its margin; hit area is larger than the drawn ring', () => {
    expect(joystickLayout()).toEqual({
      cx: JOYSTICK_MARGIN + JOYSTICK_DIAMETER / 2,
      cy: GAME_HEIGHT - JOYSTICK_MARGIN - JOYSTICK_DIAMETER / 2,
      radius: JOYSTICK_DIAMETER / 2,
      hitRadius: (JOYSTICK_DIAMETER / 2) * JOYSTICK_HIT_SCALE,
    });
    expect(joystickLayout()).toEqual(JOY);
  });
  it('fire button sits bottom-right with its margin', () => {
    const r = fireButtonRect();
    expect(r).toEqual({ x: GAME_WIDTH - 28 - 150, y: GAME_HEIGHT - 28 - 150, w: 150, h: 150 });
    expect(r).toEqual(RECT);
  });
  it('uses the brief starting values and minimums', () => {
    expect(JOYSTICK_DIAMETER).toBe(200);
    expect(JOYSTICK_MARGIN).toBe(28);
    expect(JOYSTICK_DEAD_ZONE).toBe(0.12);
    expect(FIRE_BUTTON_DIAMETER).toBe(150);
    expect(CONTROLS_ALPHA).toBe(0.45);
    expect(SHIP_MAX_SPEED).toBe(520);
    expect(SHIP_CONTROL_CLEARANCE).toBe(24);
    expect(FIRE_BUTTON_DIAMETER).toBeGreaterThanOrEqual(120);
    expect(FIRE_BUTTON_MARGIN).toBeGreaterThanOrEqual(24);
    expect(JOYSTICK_HIT_SCALE).toBeGreaterThanOrEqual(1);
    expect(BEAM_SPEED).toBeLessThanOrEqual(1400);
    expect(BEAM_BODY_H).toBeGreaterThanOrEqual(24);
  });
  it('the two controls do not overlap', () => {
    expect(JOY.cx + JOY.hitRadius).toBeLessThan(RECT.x);
  });
});

describe('ship bottom bound (never down into the controls)', () => {
  it('controlsTop is the higher (smaller y) of the joystick hit circle and the fire rect', () => {
    expect(controlsTop({ joystick: JOY, fireRect: RECT })).toBe(1022); // 1152 - 130 vs 1102
    expect(controlsTop({ joystick: { ...JOY, hitRadius: 40 }, fireRect: RECT })).toBe(1102);
  });
  it('shipMaxY keeps the whole ship sprite above the controls with clearance', () => {
    const maxY = shipMaxY({ joystick: JOY, fireRect: RECT, clearance: 24, shipHalfHeight: 38 });
    expect(maxY).toBe(1022 - 24 - 38); // 960
    expect(maxY + 38).toBeLessThan(controlsTop({ joystick: JOY, fireRect: RECT })); // ship bottom edge
  });
  it('defaults: start position is inside the bounds (code ship is 64x76)', () => {
    const maxY = shipMaxY({ shipHalfHeight: 38 });
    expect(maxY).toBe(960);
    expect(SHIP_START_Y).toBeLessThanOrEqual(maxY);
    expect(SHIP_START_Y).toBeGreaterThanOrEqual(SHIP_BOUNDS.minY);
  });
});

describe('stepShip (velocity = vector * speed, clamped to bounds)', () => {
  const bounds = { minX: 40, maxX: 680, minY: 320, maxY: 960 };
  it('moves vector * speed * dt', () => {
    const p = stepShip({ x: 360, y: 700 }, { x: 1, y: 0 }, 100, { speed: 500, bounds });
    expect(p).toEqual({ x: 410, y: 700 });
    const q = stepShip({ x: 360, y: 700 }, { x: 0, y: -0.5 }, 100, { speed: 500, bounds });
    expect(q).toEqual({ x: 360, y: 675 });
  });
  it('a zero vector does not move the ship', () => {
    expect(stepShip({ x: 360, y: 700 }, { x: 0, y: 0 }, 16, { speed: 500, bounds })).toEqual({ x: 360, y: 700 });
  });
  it('caps dt at MAX_DT_MS (100) so a long frame cannot fling the ship', () => {
    const p = stepShip({ x: 360, y: 700 }, { x: 1, y: 0 }, 5000, { speed: 500, bounds });
    expect(p.x).toBe(410);
  });
  it('clamps to the bounds, including the control line at the bottom', () => {
    expect(stepShip({ x: 50, y: 950 }, { x: -1, y: 0 }, 100, { speed: 500, bounds }).x).toBe(40);
    expect(stepShip({ x: 670, y: 950 }, { x: 1, y: 0 }, 100, { speed: 500, bounds }).x).toBe(680);
    expect(stepShip({ x: 360, y: 950 }, { x: 0, y: 1 }, 100, { speed: 500, bounds }).y).toBe(960);
    expect(stepShip({ x: 360, y: 330 }, { x: 0, y: -1 }, 100, { speed: 500, bounds }).y).toBe(320);
  });
});

describe('classifyPointer', () => {
  const cfg = { joystick: JOY, fireRect: RECT };
  it('inside the fire rect (incl. edges) is fire', () => {
    expect(classifyPointer(...FIRE, cfg)).toBe('fire');
    expect(classifyPointer(542, 1102, cfg)).toBe('fire'); // top-left corner
    expect(classifyPointer(692, 1252, cfg)).toBe('fire'); // bottom-right corner
    expect(classifyPointer(541, 1177, cfg)).toBe('none');
  });
  it('inside the joystick hit circle (larger than the drawn ring) is joystick', () => {
    expect(classifyPointer(128, 1152, cfg)).toBe('joystick');
    expect(classifyPointer(128 + 115, 1152, cfg)).toBe('joystick'); // outside the ring (100), inside hit (130)
    expect(classifyPointer(128, 1152 - 130, cfg)).toBe('joystick'); // edge
    expect(classifyPointer(128 + 131, 1152, cfg)).toBe('none');
    expect(classifyPointer(128 + 100, 1152 - 100, cfg)).toBe('none'); // box corner, outside the circle
  });
  it('anywhere else is none', () => {
    expect(classifyPointer(360, 640, cfg)).toBe('none');
    expect(classifyPointer(360, 1200, cfg)).toBe('none'); // between the two controls
  });
});

describe('pointer router (each finger belongs to the control it first pressed)', () => {
  it('(a) joystick held, tap fire: one shot and the ship keeps moving', () => {
    const r = router();
    const a = r.down(1, 128 + 100, 1152); // full right
    expect(types(a)).toEqual(['stick']);
    expect(a[0].x).toBeCloseTo(1, 10);
    expect(types(r.down(2, ...FIRE))).toEqual(['fire']);
    const m = r.move(1, 128, 1152 - 100); // full up
    expect(types(m)).toEqual(['stick']);
    expect(m[0].y).toBeCloseTo(-1, 10);
    expect(r.move(2, 620, 1180)).toEqual([]); // rubbing fire: no auto-fire
    expect(types(r.up(2))).toEqual(['fire-end']);
    expect(types(r.move(1, 128 + 60, 1152))).toEqual(['stick']);
    expect(r.stickId).toBe(1);
  });

  it('(b) a touch that starts on fire never steers, even when slid onto the joystick', () => {
    const r = router();
    expect(types(r.down(1, ...FIRE))).toEqual(['fire']);
    expect(r.move(1, 300, 1150)).toEqual([]);
    expect(r.move(1, 128, 1152)).toEqual([]);
    expect(r.move(1, 228, 1152)).toEqual([]);
    expect(r.stickId).toBe(null);
    // another finger can still use the joystick while fire is held
    expect(types(r.down(2, 128 + 50, 1152))).toEqual(['stick']);
    expect(r.move(1, 128, 1152)).toEqual([]);
    expect(types(r.up(1))).toEqual(['fire-end']);
    expect(types(r.move(2, 128 + 70, 1152))).toEqual(['stick']);
  });

  it('(c) a joystick finger stays the joystick when it leaves the circle (vector length 1)', () => {
    const r = router();
    r.down(1, 128, 1152);
    const far = r.move(1, 600, 400); // way outside, even over the play field
    expect(types(far)).toEqual(['stick']);
    expect(Math.hypot(far[0].x, far[0].y)).toBeCloseTo(1, 10);
    const onFire = r.move(1, ...FIRE); // slid onto the fire button: still steering, no shot
    expect(types(onFire)).toEqual(['stick']);
    expect(r.stickId).toBe(1);
  });

  it('(d) a touch on empty screen neither moves nor fires', () => {
    const r = router();
    expect(r.down(1, 360, 640)).toEqual([]);
    expect(r.move(1, 128, 1152)).toEqual([]); // slid onto the joystick later: still nothing
    expect(r.move(1, ...FIRE)).toEqual([]);
    expect(r.up(1)).toEqual([]);
    expect(r.stickId).toBe(null);
  });

  it('(e) losing the joystick finger zeroes the vector (stick-end)', () => {
    const r = router();
    r.down(1, 228, 1152);
    expect(r.up(1)).toEqual([{ type: 'stick-end' }]);
    r.down(2, 228, 1152);
    expect(r.cancelAll()).toEqual([{ type: 'stick-end' }]);
    expect(r.stickId).toBe(null);
  });

  it('a second finger on the joystick while it is held is ignored', () => {
    const r = router();
    r.down(1, 128, 1152);
    expect(r.down(2, 140, 1160)).toEqual([]);
    expect(r.move(2, 228, 1152)).toEqual([]);
    expect(r.up(2)).toEqual([]);
    expect(types(r.up(1))).toEqual(['stick-end']);
    expect(types(r.down(3, 128, 1152))).toEqual(['stick']); // free again
  });

  it('one shot per press: only the down edge fires', () => {
    const r = router();
    const shots = [r.down(1, ...FIRE), r.move(1, ...FIRE), r.move(1, 600, 1150), r.up(1)]
      .flat()
      .filter(a => a.type === 'fire');
    expect(shots).toHaveLength(1);
    expect(types(r.down(1, ...FIRE))).toEqual(['fire']); // next press fires again
  });

  it('firePressed tracks held fire fingers', () => {
    const r = router();
    expect(r.firePressed).toBe(false);
    r.down(1, ...FIRE);
    r.down(2, 620, 1180);
    expect(r.firePressed).toBe(true);
    r.up(1);
    expect(r.firePressed).toBe(true);
    r.up(2);
    expect(r.firePressed).toBe(false);
    expect(r.firePointerIds()).toEqual([]);
  });

  it('cancelAll ends the stick and forgets fire fingers', () => {
    const r = router();
    r.down(1, 128, 1152);
    r.down(2, ...FIRE);
    expect(types(r.cancelAll())).toEqual(['fire-end', 'stick-end']);
    expect(r.stickId).toBe(null);
    expect(r.firePressed).toBe(false);
    expect(r.cancelAll()).toEqual([]);
    expect(types(r.down(4, 128, 1152))).toEqual(['stick']);
  });

  it('a repeated down on the same id (missed up) starts clean', () => {
    const r = router();
    r.down(1, 228, 1152);
    // the up for id 1 was lost; id 1 now goes down on the fire button
    expect(types(r.down(1, ...FIRE))).toEqual(['stick-end', 'fire']);
    expect(r.stickId).toBe(null);
    expect(r.move(1, 128, 1152)).toEqual([]);
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
const make = s => new TouchControls(s, { joystick: JOY, fireRect: RECT, deadZone: DEAD });

describe('TouchControls (Phaser-facing wrapper)', () => {
  it('joystick sets vector + knob (clamped to the ring); fire fires once per press', () => {
    const s = fakeScene();
    const c = make(s);
    let fired = 0;
    c.on('fire', () => fired++);
    expect(c.vector).toEqual({ x: 0, y: 0 });
    s.input.emit('pointerdown', ptr(s, 1, 128 + 56, 1152));
    expect(c.isSteering).toBe(true);
    expect(c.vector.x).toBeCloseTo(0.5, 10);
    expect(c.knob).toEqual({ x: 56, y: 0 });
    s.input.emit('pointermove', ptr(s, 1, 128 + 300, 1152 - 400));
    expect(len(c.vector)).toBeCloseTo(1, 10);
    expect(c.knob.x).toBeCloseTo(60, 10); // 100 * 0.6
    expect(c.knob.y).toBeCloseTo(-80, 10);
    s.input.emit('pointerdown', ptr(s, 2, ...FIRE));
    s.input.emit('pointermove', ptr(s, 2, 128, 1152));
    expect(fired).toBe(1);
    expect(len(c.vector)).toBeCloseTo(1, 10); // fire finger sliding over the stick changes nothing
  });

  it('a touch elsewhere does nothing', () => {
    const s = fakeScene();
    const c = make(s);
    let fired = 0;
    c.on('fire', () => fired++);
    s.input.emit('pointerdown', ptr(s, 1, 360, 640));
    s.input.emit('pointermove', ptr(s, 1, 128 + 90, 1152));
    expect(c.isSteering).toBe(false);
    expect(c.vector).toEqual({ x: 0, y: 0 });
    expect(fired).toBe(0);
  });

  it('emits fire-state on press and release of the fire button', () => {
    const s = fakeScene();
    const c = make(s);
    const states = [];
    c.on('fire-state', v => states.push(v));
    s.input.emit('pointerdown', ptr(s, 2, ...FIRE));
    s.input.emit('pointerdown', ptr(s, 3, 620, 1180)); // second finger: still pressed, no new state
    s.input.emit('pointerup', ptr(s, 2, ...FIRE, false));
    s.input.emit('pointerup', ptr(s, 3, 620, 1180, false));
    expect(states).toEqual([true, false]);
    expect(c.firePressed).toBe(false);
  });

  it('pointerup(outside), gameout, blur, hidden, pause, sleep and a lost up all zero the vector + recentre the knob', () => {
    const s = fakeScene();
    const c = make(s);
    for (const end of [
      () => s.input.emit('pointerup', ptr(s, 1, 228, 1152, false)),
      () => s.input.emit('pointerupoutside', ptr(s, 1, 0, 0, false)),
      () => s.game.events.emit('blur'),
      () => s.game.events.emit('hidden'),
      () => s.events.emit('pause'),
      () => s.events.emit('sleep'),
      () => { ptr(s, 1, 228, 1152, false); c.update(); }, // up swallowed by another scene
    ]) {
      s.input.emit('pointerdown', ptr(s, 1, 228, 1152));
      expect(len(c.vector)).toBeCloseTo(1, 10);
      end();
      expect(c.isSteering).toBe(false);
      expect(c.vector).toEqual({ x: 0, y: 0 });
      expect(c.knob).toEqual({ x: 0, y: 0 });
    }
  });

  it('update() also releases a fire finger whose up was lost', () => {
    const s = fakeScene();
    const c = make(s);
    s.input.emit('pointerdown', ptr(s, 2, ...FIRE));
    expect(c.firePressed).toBe(true);
    ptr(s, 2, ...FIRE, false);
    c.update();
    expect(c.firePressed).toBe(false);
  });

  it('destroy removes every listener it added', () => {
    const s = fakeScene();
    const c = make(s);
    c.destroy();
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointerupoutside', 'gameout']) {
      expect(s.input.count(ev)).toBe(0);
    }
    for (const ev of ['blur', 'hidden']) expect(s.game.events.count(ev)).toBe(0);
    for (const ev of ['pause', 'sleep', 'shutdown']) expect(s.events.count(ev)).toBe(0);
  });
});

describe('gameout / adopting held pointers', () => {
  it('does not bind gameout, and a simulated gameout leaves the stick held', () => {
    const s = fakeScene();
    const c = make(s);
    expect(s.input.count('gameout')).toBe(0);
    s.input.emit('pointerdown', ptr(s, 1, 128 + 100, 1152));
    s.input.emit('gameout');
    expect(c.isSteering).toBe(true);
    expect(len(c.vector)).toBeGreaterThan(0.5);
    s.input.emit('pointerupoutside', ptr(s, 1, 900, 1300, false)); // lifted off-canvas
    expect(c.isSteering).toBe(false);
  });
  it('router.adopt takes a held pointer on the stick, never fire, never a second stick', () => {
    const r = router();
    expect(types(r.adopt(5, 128 + 50, 1152))).toEqual(['stick']);
    expect(r.stickId).toBe(5);
    expect(r.adopt(6, 128, 1152)).toEqual([]);
    const r2 = router();
    expect(r2.adopt(7, ...FIRE)).toEqual([]);
    expect(r2.firePressed).toBe(false);
    expect(r2.adopt(8, 360, 640)).toEqual([]);
  });
  it('a new TouchControls adopts a thumb already on the stick, not on the fire button', () => {
    const s = fakeScene();
    ptr(s, 1, 128 + 100, 1152);
    ptr(s, 2, ...FIRE);
    const c = make(s);
    expect(c.isSteering).toBe(true);
    expect(c.firePressed).toBe(false);
  });
});
