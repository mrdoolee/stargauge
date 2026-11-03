import { escapeGapOk } from './formations.js';
import { NAMED_STARS, ORION_BACKGROUND, CONSTELLATION_POS } from '../data/stars.js';

// Pure layout helpers for the mission-3 constellation group (normalized coords: north up, east left).

/** Normalized point -> screen point for a group whose normalized (0,0) sits at `origin`. */
export function toScreen(p, origin, scale) {
  return { x: origin.x + p.x * scale, y: origin.y + p.y * scale };
}

/**
 * Drift the group's top edge `groupY` down; once the whole group (`height` tall) is off the bottom
 * of the screen, wrap back above the top edge.
 */
export function advanceGroup(groupY, dtMs, { speed, height, screenH, margin = 0 }) {
  const y = groupY + (speed * dtMs) / 1000;
  return y > screenH + margin ? -height - margin : y;
}

/** Scale + origin that fit every point (with x,y) into `box` {x,y,w,h}, centered, aspect kept. */
export function fitLayout(points, box) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min(box.w / (maxX - minX), box.h / (maxY - minY));
  const origin = {
    x: box.x + (box.w - (maxX - minX) * scale) / 2 - minX * scale,
    y: box.y + (box.h - (maxY - minY) * scale) / 2 - minY * scale,
  };
  return { origin, scale };
}

// ---- mission-3 drifting-group layout (shared by the scene and its tests) ----------------------

export const SPRITE_HALF = 64; // star texture is 128 px: half-width at scale 1
export const GROUP_SCALE = 220;
export const GROUP_ORIGIN_X = 185;
export const STAR_PX = 0.9; // draw scale per unit of NAMED_STARS.size
export const BG_PX = 0.7;
export const TRAP_SCALE = { min: 1.62, max: 1.65 }; // min = Betelgeuse drawn size (1.8 x STAR_PX): the trap stays a big decoy
export const TRAP_GAP = 20; // min clear px between a trap sprite and any constellation sprite
export const SCREEN_EDGE = 10;

/** Every constellation sprite as { id, x, half } (x relative to screen, half = half width in px). */
export function groupSprites(originX = GROUP_ORIGIN_X, scale = GROUP_SCALE) {
  const at = p => originX + p.x * scale;
  return [
    ...ORION_BACKGROUND.map(b => ({ id: b.id, x: at(b), half: SPRITE_HALF * b.size * BG_PX })),
    ...Object.values(NAMED_STARS).map(s => ({
      id: s.id, x: at(CONSTELLATION_POS[s.id]), half: SPRITE_HALF * s.size * STAR_PX,
    })),
  ];
}

/** Horizontal extent of the sprites relative to originX (left <= 0 <= right in practice). */
export function groupExtent(sprites, originX = 0) {
  return {
    left: Math.min(...sprites.map(s => s.x - s.half)) - originX,
    right: Math.max(...sprites.map(s => s.x + s.half)) - originX,
  };
}

/** originX at time tMs: the whole group stays on screen and sways between both edges (starts centered). */
export function groupSwayX(tMs, { extent, screenW, edge = SCREEN_EDGE, periodMs }) {
  const lo = edge - extent.left;
  const hi = screenW - edge - extent.right;
  return (lo + hi) / 2 + ((hi - lo) / 2) * Math.sin((2 * Math.PI * tMs) / periodMs);
}

/** Screen rectangle of the group. `sprites` are relative to originX 0 (groupSprites(0)). */
export function groupBox(originX, groupY, sprites, height) {
  const { left, right } = groupExtent(sprites);
  const pad = Math.max(...sprites.map(s => s.half)); // sprite centers lie within [groupY, groupY + height]
  return { left: originX + left, right: originX + right, top: groupY - pad, bottom: groupY + height + pad };
}

/**
 * True when a trap flying from (x, y0) at time t0Ms never comes within `gap` px of the group box.
 * Motion: y = y0 + vy*t; x = x + vx*t (+ amp*sin(2*pi*t/period) for a zigzag, the integral of zigzagVx).
 * `boxAt(absoluteMs)` gives the group box at that time. Simulates until the trap has left the bottom.
 */
export function isTrapPathClear({ x, vx = 0, vy, y0, t0Ms, zigzag = null }, boxAt, { trapHalf, gap = TRAP_GAP, screenH, stepMs = 50 }) {
  const r = trapHalf + gap;
  for (let k = 0; ; k += stepMs) {
    const y = y0 + (vy * k) / 1000;
    if (y - trapHalf > screenH) return true;
    const tx = x + (vx * k) / 1000 + (zigzag ? zigzag.amp * Math.sin((2 * Math.PI * k) / zigzag.periodMs) : 0);
    const b = boxAt(t0Ms + k);
    if (tx + r > b.left && tx - r < b.right && y + r > b.top && y - r < b.bottom) return false;
  }
}

/** Would adding `cand` ({ delayMs, x, zigzag }) to the recent traps still leave the ship a gap? */
export function trapKeepsEscapeGap(recent, cand, { trapHalf, shipWidth, screenW }) {
  return escapeGapOk([...recent, cand], { shipWidth, minX: 0, maxX: screenW, objectWidth: 2 * trapHalf });
}
