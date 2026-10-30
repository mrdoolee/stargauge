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
export const GROUP_SCALE = 300; // px per normalized unit while drifting
export const GROUP_ORIGIN_X = 185;
export const STAR_PX = 0.9; // draw scale per unit of NAMED_STARS.size
export const BG_PX = 0.7;
export const TRAP_SCALE = { min: 1.2, max: 1.3 };
export const TRAP_GAP = 40; // min clear px between a trap sprite and any constellation sprite
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

/** Trap-center x range that keeps the widest trap `gap` px clear of the group and on screen. */
export function trapLane(sprites, { trapScale = TRAP_SCALE, gap = TRAP_GAP, screenW, edge = SCREEN_EDGE }) {
  const trapHalf = SPRITE_HALF * trapScale.max;
  const groupRight = Math.max(...sprites.map(s => s.x + s.half));
  return { min: groupRight + gap + trapHalf, max: screenW - edge - trapHalf, trapHalf };
}
