// Formation library: pure geometry for waves of falling objects. A wave director picks a
// formation (pickFormation) and expands it into one Slot per object (buildFormation).
// Slot = { delayMs, x, vx, aim, zigzag: { amp, periodMs } | null }. No Phaser imports.

import {
  FORMATION_LINE_STAGGER_MS,
  FORMATION_VEE_SPACING_PX,
  FORMATION_VEE_RANK_MS,
  FORMATION_VEE_LEAN_PX,
  FORMATION_DIAGONAL_STEP_PX,
  FORMATION_DIAGONAL_STEP_MS,
  FORMATION_DRIFT_VX,
  FORMATION_PINCER_PAIR_MS,
  FORMATION_PINCER_EDGE_JITTER_PX,
  FORMATION_ZIGZAG_AMP_PX,
  FORMATION_ZIGZAG_PERIOD_MS,
  FORMATION_ZIGZAG_STEP_MS,
  FORMATION_EDGE_JITTER_PX,
  FORMATION_ZIGZAG_CENTER_JITTER_PX,
  FORMATION_GAP_WINDOW_MS,
  FORMATION_OBJECT_WIDTH,
} from '../config/balance.js';

export const FORMATION_IDS = ['line', 'vee', 'diagonal', 'pincer', 'zigzag', 'aimed'];
export const EASY_FORMATION_IDS = ['line', 'vee', 'diagonal'];
const SIDES = ['left', 'center', 'right'];

const slot = (delayMs, x, vx = 0, extra = {}) => ({ delayMs, x, vx, aim: false, zigzag: null, ...extra });
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pickFrom = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

/**
 * Zigzag sway: vx (px/s) at tMs after spawn. x offset = amp*sin(2*pi*t/period), so vx is its derivative
 * plus the slot's base drift. zigzag null -> baseVx.
 */
export function zigzagVx(baseVx, zigzag, tMs) {
  if (!zigzag) return baseVx;
  const w = (2 * Math.PI) / zigzag.periodMs;
  return baseVx + zigzag.amp * w * 1000 * Math.cos(w * tMs);
}

export function pickFormation({ prevId = null, prevSide = null, diffKey, aimAllowed, rng }) {
  let ids = diffKey === 'easy' ? EASY_FORMATION_IDS : FORMATION_IDS;
  if (diffKey === 'easy' || !aimAllowed) ids = ids.filter((id) => id !== 'aimed');
  const idPool = ids.filter((id) => id !== prevId);
  const sidePool = SIDES.filter((s) => s !== prevSide);
  return {
    id: pickFrom(idPool.length ? idPool : ids, rng),
    side: pickFrom(sidePool, rng),
  };
}

function buildLine({ side, count, minX, maxX }) {
  // count + 1 evenly spaced columns, one interior column left empty = the gap.
  const cols = count + 1;
  const step = (maxX - minX) / (cols - 1);
  const mid = Math.round((cols - 1) / 2);
  const skip = side === 'left' ? 1 : side === 'right' ? cols - 2 : mid;
  const slots = [];
  for (let c = 0, n = 0; c < cols; c++) {
    if (c === skip) continue;
    slots.push(slot(n++ * FORMATION_LINE_STAGGER_MS, minX + c * step));
  }
  return slots;
}

function buildVee({ side, count, minX, maxX }) {
  const center = (minX + maxX) / 2;
  const lean = side === 'left' ? -FORMATION_VEE_LEAN_PX : side === 'right' ? FORMATION_VEE_LEAN_PX : 0;
  const cx = center + lean;
  // center = V (apex leads); left/right = inverted V (wings lead, apex last), leaning that way.
  const inverted = side !== 'center';
  const items = [];
  for (let i = 0; i < count; i++) {
    const rank = Math.ceil(i / 2);
    const dir = i === 0 ? 0 : i % 2 === 1 ? -1 : 1;
    items.push({ rank, x: cx + dir * rank * FORMATION_VEE_SPACING_PX });
  }
  const maxRank = Math.max(...items.map((it) => it.rank));
  const slots = items.map((it) =>
    slot((inverted ? maxRank - it.rank : it.rank) * FORMATION_VEE_RANK_MS, clamp(it.x, minX, maxX)),
  );
  return slots.sort((a, b) => a.delayMs - b.delayMs);
}

function buildDiagonal({ side, count, minX, maxX, rng }) {
  const dir = side === 'left' ? 1 : side === 'right' ? -1 : rng() < 0.5 ? 1 : -1;
  const span = (count - 1) * FORMATION_DIAGONAL_STEP_PX;
  let start;
  if (side === 'center') start = (minX + maxX) / 2 - (dir * span) / 2;
  else if (dir === 1) start = minX + rng() * FORMATION_EDGE_JITTER_PX;
  else start = maxX - rng() * FORMATION_EDGE_JITTER_PX;
  const slots = [];
  for (let i = 0; i < count; i++) {
    slots.push(slot(i * FORMATION_DIAGONAL_STEP_MS, clamp(start + dir * i * FORMATION_DIAGONAL_STEP_PX, minX, maxX), dir * FORMATION_DRIFT_VX));
  }
  return slots;
}

function buildPincer({ side, count, minX, maxX, rng }) {
  const slots = [];
  const leftFirst = side !== 'right';
  for (let i = 0; i < count; i++) {
    const pair = Math.floor(i / 2);
    const isLeft = (i % 2 === 0) === leftFirst;
    const jitter = rng() * FORMATION_PINCER_EDGE_JITTER_PX;
    slots.push(
      isLeft
        ? slot(pair * FORMATION_PINCER_PAIR_MS, minX + jitter, FORMATION_DRIFT_VX)
        : slot(pair * FORMATION_PINCER_PAIR_MS, maxX - jitter, -FORMATION_DRIFT_VX),
    );
  }
  return slots;
}

function buildZigzag({ side, count, minX, maxX, rng }) {
  const lo = minX + FORMATION_ZIGZAG_AMP_PX;
  const hi = maxX - FORMATION_ZIGZAG_AMP_PX;
  const cx =
    side === 'left' ? lo + rng() * FORMATION_EDGE_JITTER_PX : side === 'right' ? hi - rng() * FORMATION_EDGE_JITTER_PX : (lo + hi) / 2 + (rng() - 0.5) * FORMATION_ZIGZAG_CENTER_JITTER_PX;
  const x = clamp(cx, lo, hi);
  const slots = [];
  for (let i = 0; i < count; i++) {
    slots.push(slot(i * FORMATION_ZIGZAG_STEP_MS, x, 0, { zigzag: { amp: FORMATION_ZIGZAG_AMP_PX, periodMs: FORMATION_ZIGZAG_PERIOD_MS } }));
  }
  return slots;
}

function buildAimed({ side, minX, maxX, rng }) {
  const third = (maxX - minX) / 3;
  const base = side === 'left' ? minX : side === 'right' ? minX + 2 * third : minX + third;
  return [slot(0, base + rng() * third, 0, { aim: true })];
}

const BUILDERS = {
  line: buildLine,
  vee: buildVee,
  diagonal: buildDiagonal,
  pincer: buildPincer,
  zigzag: buildZigzag,
  aimed: buildAimed,
};

export function buildFormation({ id, side, count, minX, maxX, rng }) {
  const build = BUILDERS[id];
  if (!build) throw new Error(`unknown formation: ${id}`);
  return build({ side, count, minX, maxX, rng });
}

export function escapeGapOk(slots, { shipWidth, minX, maxX, windowMs = FORMATION_GAP_WINDOW_MS, objectWidth = FORMATION_OBJECT_WIDTH }) {
  // Motion: a zigzag slot sweeps +-amp while falling, so its footprint is widened by amp.
  // Plain vx drift is ignored on purpose: same-direction drift (diagonal) preserves the gaps
  // between objects, and pincer's inward drift opens the wall gaps as it closes the middle.
  const need = 1.5 * shipWidth;
  const half = objectWidth / 2;
  for (const anchor of slots) {
    const group = slots
      .filter((s) => s.delayMs >= anchor.delayMs && s.delayMs <= anchor.delayMs + windowMs)
      .map((s) => ({ x: s.x, reach: half + (s.zigzag ? s.zigzag.amp : 0) }))
      .sort((a, b) => a.x - b.x);
    let edge = minX; // right edge of the last blocker (the left wall to start)
    let best = 0;
    for (const { x, reach } of group) {
      best = Math.max(best, x - reach - edge);
      edge = Math.max(edge, x + reach);
    }
    best = Math.max(best, maxX - edge);
    if (best < need) return false;
  }
  return true;
}
