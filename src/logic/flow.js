// Pure helpers for the end of the game: playtime estimate, result summary, restart key list.
import {
  M1_PRACTICE_SEC, M4_TIME_LIMIT_SEC, FORMATION_GAP_MS, M1_BLOB_START_WEIGHTS,
  M1_ASTEROID_SLOT_CHANCE, MISSION_GOAL_COUNTS, SPAWN_NEEDED_GUARANTEE,
} from '../config/balance.js';
import { STAR_COLORS } from './temperature.js';
import { getDifficulty, formationSlotsPerSec } from './difficulty.js';

/**
 * Student-pace assumptions (NOT measured: no human playtest was possible). Revisit after a field test.
 * hit = chance that a spawned *needed* target is hit correctly; read = seconds spent reading.
 */
export const PACE = {
  // hit.m2 0.4 -> 0.25 and retry.easy 1.3 -> 1.0 (2026-11-04): m2 formations are sparser than the old single spawns, so a normal m2
  // must stay in the spec 4-minute band, while easy (no restarts: heat barely fills) still fits 15 minutes. Unmeasured.
  hit: { m1: 0.4, m2: 0.25 }, // m1 0.3 -> 0.4 (2026-11-04): only 40% of blobs are white now (mixed start colors), so the per-white hit chance is higher than per-blob; keeps m1 in the spec band. Unmeasured.
  read: { title: 10, briefing: 25, m1: 25, m2: 25, m3: 25, m4: 15, card: 15, picture: 20, chart: 45 },
  m3FindSec: 45, // 3-a: find the hottest of three
  m3OrderSec: 60, // 3-b: three ordered shots
  m4SecPerStar: 16,
  m4Stars: 12,
  retryFactor: 1.5, // heat restarts / wrong-shot detours on the timed missions (normal)
  retryByDifficulty: { easy: 1.0, normal: 1.5, hard: 1.8 }, // fewer / more restarts and detours
  quizSec: 90,
  resultSec: 20,
};

/** Expected spawns until every one of `k` needed colors (of 7) has appeared (guarantee caps the wait). */
function m2Spawns(k) {
  let n = 0;
  for (let i = k; i >= 1; i--) n += Math.min(7 / i, SPAWN_NEEDED_GUARANTEE + 1);
  return n;
}

const targetsPerSec = (gapMs, diffKey, slotShare = 1) => formationSlotsPerSec(gapMs, diffKey) * slotShare;

export function estimateFlow({
  goals = MISSION_GOAL_COUNTS, gaps = FORMATION_GAP_MS, m4Limit = M4_TIME_LIMIT_SEC, practice = M1_PRACTICE_SEC, difficulty = 'normal',
} = {}) {
  const P = PACE;
  const d = getDifficulty(difficulty);
  const retry = P.retryByDifficulty[d.key];
  const m1 = P.read.m1 + practice + (goals.m1 / P.hit.m1) / targetsPerSec(gaps.m1, d.key, (1 - M1_ASTEROID_SLOT_CHANCE) * M1_BLOB_START_WEIGHTS.white) * retry + P.read.card;
  const m2spawns = m2Spawns(4) + m2Spawns(2); // 2-a: 4 hotter colors, 2-b: 2 cooler colors
  const m2 = P.read.m2 + (m2spawns / P.hit.m2) / targetsPerSec(gaps.m2, d.key) * retry + P.read.card;
  const m3 = P.read.m3 + P.m3FindSec + P.m3OrderSec + P.read.picture;
  const m4 = P.read.m4 + Math.min(m4Limit, P.m4Stars * P.m4SecPerStar) + P.read.chart;
  const rows = [
    { id: 'title', label: '시작', sec: P.read.title },
    { id: 'briefing-m1', label: '브리핑 1', sec: P.read.briefing },
    { id: 'm1', label: '미션 1', sec: m1 },
    { id: 'briefing-m2', label: '브리핑 2', sec: P.read.briefing },
    { id: 'm2', label: '미션 2', sec: m2 },
    { id: 'briefing-m3', label: '브리핑 3', sec: P.read.briefing },
    { id: 'm3', label: '미션 3', sec: m3 },
    { id: 'briefing-m4', label: '브리핑 4', sec: P.read.briefing },
    { id: 'm4', label: '미션 4', sec: m4 },
    { id: 'report', label: '귀환 보고서', sec: P.quizSec },
    { id: 'result', label: '결과', sec: P.resultSec },
  ];
  return { rows, totalSec: rows.reduce((a, r) => a + r.sec, 0) };
}

const clampStars = n => Math.min(3, Math.max(1, Math.round(Number(n) || 1)));
export const ALL_COLOR_KEYS = STAR_COLORS.map(c => c.key);

/** Everything the result screen shows, from registry values. Safe on missing data. */
export function buildResultSummary({ results = {}, orionTagged = [], gaugeFinal } = {}) {
  const missions = ['m1', 'm2', 'm3', 'm4'].map((id, i) => ({
    id, label: `미션 ${i + 1}`, stars: clampStars(results[id]?.stars),
  }));
  const q = results.quiz ?? { correct: 0, total: 3 };
  return {
    missions,
    quizText: `${q.correct ?? 0} / ${q.total ?? 3}`,
    // m2 stores gaugeFinal (all 7 cells when the mission completes); fall back to the full gauge.
    gauge: Array.isArray(gaugeFinal) && gaugeFinal.length ? gaugeFinal : ALL_COLOR_KEYS,
    orionTagged: orionTagged ?? [],
  };
}

/** Registry keys wiped by "처음부터 다시". `muted` is a preference and is kept. */
export const clearRunKeys = ['results', 'orionTagged', 'gaugeFinal'];
