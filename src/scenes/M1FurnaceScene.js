// Mission 1 — 용광로 탈출. Teach (instruction) -> practice (30 s, no asteroids, no collision heat)
// -> test (collisions on, a few asteroids). Correct = the blob is 'white' at the moment of the hit
// (or left white at most M1_WHITE_GRACE_MS ago). Cooling starts below the HUD band, so the white
// window is on screen (y ~344-624). After an overheat restart the practice is skipped.
import BaseMissionScene from './BaseMissionScene.js';
import { GAME_WIDTH } from '../config/game.js';
import {
  M1_PRACTICE_SEC, M1_ASTEROID_INTERVAL_MS, M1_BLOB_SPEED, MISSION_GOAL_COUNTS,
} from '../config/balance.js';
import { scaleSpeed, scaleInterval } from '../logic/difficulty.js';
import { predicateJudge } from '../logic/judges.js';
import { furnaceStageAt, furnaceFallFraction, countsAsWhite, practiceToastDue } from '../logic/furnace.js';
import { MISSION_TEXT } from '../data/copy.js';

const SPAWN_Y = -60;
const rand = (a, b) => a + Math.random() * (b - a);

export default class M1FurnaceScene extends BaseMissionScene {
  constructor() {
    super('m1');
    this.showGauge = false;
    this.toastAt = 'low'; // toasts below the white zone, never on top of it
  }

  buildPhases() {
    const test = {
      id: 'm1',
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
    this.asteroidAcc = 0;
    if (!phase.practice) {
      this.toast('이제 진짜예요! 흰색일 때만 쏘고, 부딪히면 선체 온도가 올라가요.', { tone: 'info' });
    }
  }

  spawnObject() {
    const o = this.spawnStar({
      x: rand(70, GAME_WIDTH - 70),
      y: SPAWN_Y,
      colorKey: 'white',
      kind: 'furnace',
      scale: rand(0.9, 1.3),
      glow: 0.7,
      vy: scaleSpeed(rand(M1_BLOB_SPEED.min, M1_BLOB_SPEED.max), this.diff.key),
    });
    if (o) o.whiteEndedAt = null; // pooled object: clear the previous blob's value
  }

  onMissionUpdate(dt) {
    this.clockMs += dt;
    // Cooling: stage follows the distance fallen below the HUD; colorKey is what heat and the judge read.
    for (const o of this.pools.stars.members) {
      if (!o.active || o.kind !== 'furnace' || o.marked) continue;
      const stage = furnaceStageAt(furnaceFallFraction(o.y));
      if (o.colorKey === 'white' && stage !== 'white') o.whiteEndedAt = this.clockMs;
      this.setObjectColor(o, stage);
    }
    if (this.phaseDone) return;
    this.phaseMs += dt;
    if (this.phase.practice) {
      if (this.phaseMs >= M1_PRACTICE_SEC * 1000) this.completePhase();
    } else {
      this.asteroidAcc += dt;
      if (this.asteroidAcc >= scaleInterval(M1_ASTEROID_INTERVAL_MS, this.diff.key)) {
        this.asteroidAcc = 0;
        this.spawnAsteroid({ x: rand(70, GAME_WIDTH - 70), y: SPAWN_Y, vx: rand(-40, 40), vy: scaleSpeed(rand(220, 300), this.diff.key), scale: rand(0.9, 1.3) });
      }
    }
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
      nextData: { title: '정리 카드', body: MISSION_TEXT.m1.card, next: 'm2' },
    });
  }
}
