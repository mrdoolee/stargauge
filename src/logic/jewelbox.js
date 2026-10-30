// Pure helpers for mission 4 (jewel box cluster).
import { STAR_COLORS } from './temperature.js';

/** Per-color star counts of a cluster, hottest first; colors with no stars are skipped. */
export function colorCounts(stars) {
  return STAR_COLORS
    .map(c => ({ key: c.key, label: c.label, hex: c.hex, count: stars.filter(s => s.colorKey === c.key).length }))
    .filter(c => c.count > 0);
}

/** Horizontal sway offset (px) at time tMs. */
export function swayOffset(tMs, amp, periodMs, phase = 0) {
  return amp * Math.sin((2 * Math.PI * tMs) / periodMs + phase);
}

/** Normalized (0..1) layout point -> screen point inside area {x,y,w,h}. */
export function clusterPosition(p, area) {
  return { x: area.x + p.x * area.w, y: area.y + p.y * area.h };
}

/** Timeout scoring: each unmarked star counts as one wrong shot. */
export function unmarkedMisses(stars) {
  return stars.filter(s => !s.marked).length;
}

export function formatTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
