import { describe, it, expect } from 'vitest';
import { wrongShotMessage } from '../../src/data/copy.js';

describe('wrongShotMessage m4', () => {
  it('explains scattered blue stars and keeps the tail, no numbers', () => {
    const m = wrongShotMessage('m4', { colorKey: 'blue' });
    expect(m).toContain('청색');
    expect(m.endsWith('온도는 색으로 비교해요.')).toBe(true);
    expect(m).not.toMatch(/\d|켈빈/);
  });
});

import { MISSION_TEXT } from '../../src/data/copy.js';
import { formatTime } from '../../src/logic/jewelbox.js';
import { GAME_WIDTH } from '../../src/config/game.js';
import { HUD_SAFE_MARGIN } from '../../src/config/balance.js';

// HUD instruction band: x from M to the goal counter = GAME_WIDTH - 2*M - 140 = 532 px, 30 px font.
const BAND_W = GAME_WIDTH - 2 * HUD_SAFE_MARGIN - 140;
const FONT_PX = 30;

// Conservative advance widths at 30 px (Hangul a full em; Malgun Gothic / Noto Sans KR are slightly narrower).
function glyphW(ch) {
  if (/[ㄱ-ㆎ가-힣]/.test(ch)) return FONT_PX;
  if (ch === ' ') return 0.3 * FONT_PX;
  if (/[0-9]/.test(ch)) return 0.58 * FONT_PX;
  if (/[():!·.,]/.test(ch)) return 0.36 * FONT_PX;
  return 0.6 * FONT_PX;
}
const textW = t => [...t].reduce((w, c) => w + glyphW(c), 0);

/** Greedy word wrap (what Phaser's advanced wrap does at spaces); a too-long word gets its own extra lines. */
function wrapLines(text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (textW(next) <= width) { line = next; continue; }
    if (line) lines.push(line);
    line = word;
    while (textW(line) > width) { lines.push(line); line = ''; } // pathological: count it as overflow
  }
  if (line) lines.push(line);
  return lines;
}

describe('MISSION_TEXT.m4 HUD band', () => {
  const line = `${MISSION_TEXT.m4.instruction} (남은 시간 ${formatTime(210)})`;

  it('says plainly to SHOOT the cluster stars to mark them, and to avoid the scattered blue ones', () => {
    expect(MISSION_TEXT.m4.instruction).toBe('성단의 별을 모두 쏴서 표시! 흩어지는 청색 별은 피해요');
    expect(MISSION_TEXT.m4.instruction).toContain('쏴서 표시');
    expect(MISSION_TEXT.m4.instruction).toContain('청색');
  });

  it('instruction + timer suffix fits two lines at 30 px in the 532 px band', () => {
    expect(BAND_W).toBe(532);
    const lines = wrapLines(line, BAND_W);
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(line.length).toBeLessThanOrEqual(44); // pin: a longer text needs a new fit check
  });

  it('the wrap model is not trivially loose (17 Hangul fit a line, 18 do not)', () => {
    expect(wrapLines('가'.repeat(17), BAND_W)).toHaveLength(1);
    expect(textW('가'.repeat(18))).toBeGreaterThan(BAND_W);
  });
});
