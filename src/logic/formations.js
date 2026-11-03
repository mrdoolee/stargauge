// Formation library: pure geometry for waves of falling objects. A wave director picks a
// formation (pickFormation) and expands it into one Slot per object (buildFormation).
// Slot = { delayMs, x, vx, aim, zigzag: { amp, periodMs } | null }. No Phaser imports.

export const FORMATION_IDS = ['line', 'vee', 'diagonal', 'pincer', 'zigzag', 'aimed'];
export const EASY_FORMATION_IDS = ['line', 'vee', 'diagonal'];
const SIDES = ['left', 'center', 'right'];

const LINE_STAGGER_MS = 150;
const VEE_SPACING_PX = 110;
const VEE_RANK_MS = 300;
const VEE_LEAN_PX = 60;
const DIAGONAL_STEP_PX = 100;
const DIAGONAL_STEP_MS = 300;
const DRIFT_VX = 60; // px/s sideways drift for diagonal / pincer
const PINCER_PAIR_MS = 500;
const PINCER_EDGE_JITTER_PX = 30;
const ZIGZAG_AMP_PX = 80;
const ZIGZAG_PERIOD_MS = 1800;
const ZIGZAG_STEP_MS = 300;

const slot = (delayMs, x, vx = 0, extra = {}) => ({ delayMs, x, vx, aim: false, zigzag: null, ...extra });
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pickFrom = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

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
    slots.push(slot(n++ * LINE_STAGGER_MS, minX + c * step));
  }
  return slots;
}

function buildVee({ side, count, minX, maxX }) {
  const center = (minX + maxX) / 2;
  const lean = side === 'left' ? -VEE_LEAN_PX : side === 'right' ? VEE_LEAN_PX : 0;
  const cx = center + lean;
  // center = V (apex leads); left/right = inverted V (wings lead, apex last), leaning that way.
  const inverted = side !== 'center';
  const items = [];
  for (let i = 0; i < count; i++) {
    const rank = Math.ceil(i / 2);
    const dir = i === 0 ? 0 : i % 2 === 1 ? -1 : 1;
    items.push({ rank, x: cx + dir * rank * VEE_SPACING_PX });
  }
  const maxRank = Math.max(...items.map((it) => it.rank));
  const slots = items.map((it) =>
    slot((inverted ? maxRank - it.rank : it.rank) * VEE_RANK_MS, clamp(it.x, minX, maxX)),
  );
  return slots.sort((a, b) => a.delayMs - b.delayMs);
}

function buildDiagonal({ side, count, minX, maxX, rng }) {
  const dir = side === 'left' ? 1 : side === 'right' ? -1 : rng() < 0.5 ? 1 : -1;
  const span = (count - 1) * DIAGONAL_STEP_PX;
  let start;
  if (side === 'center') start = (minX + maxX) / 2 - (dir * span) / 2;
  else if (dir === 1) start = minX + rng() * 40;
  else start = maxX - rng() * 40;
  const slots = [];
  for (let i = 0; i < count; i++) {
    slots.push(slot(i * DIAGONAL_STEP_MS, clamp(start + dir * i * DIAGONAL_STEP_PX, minX, maxX), dir * DRIFT_VX));
  }
  return slots;
}

function buildPincer({ side, count, minX, maxX, rng }) {
  const slots = [];
  const leftFirst = side !== 'right';
  for (let i = 0; i < count; i++) {
    const pair = Math.floor(i / 2);
    const isLeft = (i % 2 === 0) === leftFirst;
    const jitter = rng() * PINCER_EDGE_JITTER_PX;
    slots.push(
      isLeft
        ? slot(pair * PINCER_PAIR_MS, minX + jitter, DRIFT_VX)
        : slot(pair * PINCER_PAIR_MS, maxX - jitter, -DRIFT_VX),
    );
  }
  return slots;
}

function buildZigzag({ side, count, minX, maxX, rng }) {
  const lo = minX + ZIGZAG_AMP_PX;
  const hi = maxX - ZIGZAG_AMP_PX;
  const cx =
    side === 'left' ? lo + rng() * 40 : side === 'right' ? hi - rng() * 40 : (lo + hi) / 2 + (rng() - 0.5) * 60;
  const x = clamp(cx, lo, hi);
  const slots = [];
  for (let i = 0; i < count; i++) {
    slots.push(slot(i * ZIGZAG_STEP_MS, x, 0, { zigzag: { amp: ZIGZAG_AMP_PX, periodMs: ZIGZAG_PERIOD_MS } }));
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

export function escapeGapOk(slots, { shipWidth, minX, maxX, windowMs = 400, objectWidth = 72 }) {
  const need = 1.5 * shipWidth;
  const half = objectWidth / 2;
  for (const anchor of slots) {
    const group = slots
      .filter((s) => s.delayMs >= anchor.delayMs && s.delayMs <= anchor.delayMs + windowMs)
      .map((s) => s.x)
      .sort((a, b) => a - b);
    let edge = minX; // right edge of the last blocker (the left wall to start)
    let best = 0;
    for (const x of group) {
      best = Math.max(best, x - half - edge);
      edge = Math.max(edge, x + half);
    }
    best = Math.max(best, maxX - edge);
    if (best < need) return false;
  }
  return true;
}
