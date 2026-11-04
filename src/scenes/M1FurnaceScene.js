// Mission 1 — 용광로 탈출. Teach (instruction) -> practice (15 s, no asteroids, no collision heat)
// -> test (collisions on, a few asteroids). Correct = the blob is 'white' at the moment of the hit
// (or left white at most M1_WHITE_GRACE_MS ago). Cooling starts below the HUD band, so the white
// window is on screen (y ~344-624). After an overheat restart the practice is skipped.
import BaseMissionScene from './BaseMissionScene.js';
import {
  M1_PRACTICE_SEC, M1_ASTEROID_SLOT_CHANCE, M1_BLOB_SPEED, MISSION_GOAL_COUNTS,
} from '../config/balance.js';
import { GAME_WIDTH } from '../config/game.js';
import { scaleSpeed } from '../logic/difficulty.js';
import { speedFor, aimVelocity, createFormationMemo } from '../logic/speed.js';
import { predicateJudge } from '../logic/judges.js';
import {
  furnaceStageAt, furnaceFallFraction, countsAsWhite, practiceToastDue, pickBlobStart, stageStartFraction,
} from '../logic/furnace.js';
import { MISSION_TEXT } from '../data/copy.js';

const SPAWN_Y = -60;
const rand = (a, b) => a + Math.random() * (b - a);

export default class M1FurnaceScene extends BaseMissionScene {
  constructor() {
    super('m1');
    this.showGauge = false;
    this.backdropKey = 'bg-furnace'; // static furnace interior
    this.toastAt = 'low'; // toasts below the white zone, never on top of it
  }

  buildPhases() {
    const test = {
      id: 'm1',
      waves: true,
      judge: predicateJudge(t => this.isWhiteHit(t.obj)),
      remaining: s => MISSION_GOAL_COUNTS.m1 - s.phaseHits,
    };
    // Practice only on the first entry of a playthrough; an overheat restart goes straight to the test.
    if (this.isRestart) return [test];
    return [
      {
        id: 'm1',
        practice: true,
        judge: null, // practice: hits only mark the blob
        collisions: false,
        instruction: '연습! ' + MISSION_TEXT.m1.instruction,
      },
      test,
    ];
  }

  setupMission() {
    this.clockMs = 0; // mission-local clock (only advances while playing, so pause never eats the grace window)
    this.lastPracticeToast = { white: null, cooled: null };
    this.sinceWhite = 0; // non-white blob starts since the last white one (one counter per run)
  }

  /** Spawn a blob that starts in a weighted random stage (it keeps cooling as it falls). */
  spawnBlob(props) {
    const pick = pickBlobStart({ sinceWhite: this.sinceWhite });
    this.sinceWhite = pick.sinceWhite;
    const o = this.spawnStar({ ...props, colorKey: pick.stage, kind: 'furnace', glow: 0.7 });
    if (o) {
      o.coolOffset = stageStartFraction(pick.stage);
      // Pooled object: reset. A blob that never was white can never count as "just left white".
      o.whiteEndedAt = pick.stage === 'white' ? null : -Infinity;
    }
    return o;
  }

  /** White now, or white until at most M1_WHITE_GRACE_MS ago. */
  isWhiteHit(obj) {
    const since = obj.whiteEndedAt === null || obj.whiteEndedAt === undefined ? null : this.clockMs - obj.whiteEndedAt;
    return countsAsWhite(obj.colorKey, since);
  }

  practiceTone(obj) {
    return this.isWhiteHit(obj) ? 'correct' : 'neutral';
  }

  onPhaseStart(phase) {
    this.phaseMs = 0;
    this.asteroidSpeed = createFormationMemo(); // formation indices restart each phase
    this.blobSpeed = createFormationMemo();
    if (!phase.practice) {
      this.toast('이제 진짜예요! 흰색일 때만 쏘고, 부딪히면 선체 온도가 올라가요.', { tone: 'info' });
    }
  }

  spawnObject(phase, slot) {
    if (!slot) {
      // Practice: timer spawner, no formations.
      this.spawnBlob({
        x: rand(70, GAME_WIDTH - 70), y: SPAWN_Y,
        scale: rand(0.9, 1.3), vy: scaleSpeed(rand(M1_BLOB_SPEED.min, M1_BLOB_SPEED.max), this.diff.key),
      });
      return;
    }
    // Test: aimed slots and a share of the others become asteroids; the rest are furnace blobs.
    if (slot.aim || Math.random() < M1_ASTEROID_SLOT_CHANCE) {
      // One speed per formation keeps a row together; aimed slots keep their own.
      const speed = slot.aim ? speedFor('hazard', this.diff.key, slot.tier)
        : this.asteroidSpeed(slot.formationIndex, () => speedFor('hazard', this.diff.key, slot.tier));
      let vx = slot.vx;
      let vy = speed;
      if (slot.aim) ({ vx, vy } = aimVelocity({ x: slot.x, y: SPAWN_Y }, { x: this.ship.x, y: this.ship.y }, speed));
      this.spawnAsteroid({ x: slot.x, y: SPAWN_Y, vx, vy, scale: rand(0.9, 1.3), zigzag: slot.zigzag });
      return;
    }
    this.spawnBlob({
      x: slot.x, y: SPAWN_Y, scale: rand(0.9, 1.3),
      vx: slot.vx, zigzag: slot.zigzag,
      vy: this.blobSpeed(slot.formationIndex, () => scaleSpeed(rand(M1_BLOB_SPEED.min, M1_BLOB_SPEED.max), this.diff.key)),
    });
  }

  onMissionUpdate(dt) {
    this.clockMs += dt;
    // Cooling: stage follows the distance fallen below the HUD; colorKey is what heat and the judge read.
    for (const o of this.pools.stars.members) {
      if (!o.active || o.kind !== 'furnace' || o.marked) continue;
      const stage = furnaceStageAt(Math.min(1, furnaceFallFraction(o.y) + (o.coolOffset || 0)));
      if (o.colorKey === 'white' && stage !== 'white') o.whiteEndedAt = this.clockMs;
      this.setObjectColor(o, stage);
    }
    if (this.phaseDone) return;
    this.phaseMs += dt;
    if (this.phase.practice && this.phaseMs >= M1_PRACTICE_SEC * 1000) this.completePhase();
  }

  onCorrectHit(obj, result) {
    if (!result.practice) return;
    // Feedback, not a running commentary: each kind shows the first time, then at most every few seconds.
    const kind = result.neutral ? 'cooled' : 'white';
    if (!practiceToastDue(this.lastPracticeToast[kind], this.clockMs)) return;
    this.lastPracticeToast[kind] = this.clockMs;
    this.toast(kind === 'white' ? '흰색일 때 맞혔어요! 가장 뜨거운 쇳물이에요.' : '이미 식은 쇳물이에요. 흰색일 때 쏴 보세요.', { tone: 'info' });
  }

  onPhaseComplete(phase) {
    if (phase.practice) {
      this.advancePhase();
      return;
    }
    this.completeMission({
      next: 'card',
      nextData: { title: '정리 카드', body: MISSION_TEXT.m1.card, next: 'briefing', nextData: { mission: 'm2' } },
    });
  }
}
