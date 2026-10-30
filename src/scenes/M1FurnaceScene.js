// Mission 1 — 용광로 탈출. Teach (instruction) -> practice (30 s, no asteroids, no collision heat)
// -> test (collisions on, a few asteroids). Correct = the blob is 'white' at the moment of the hit.
import BaseMissionScene from './BaseMissionScene.js';
import { GAME_WIDTH } from '../config/game.js';
import {
  M1_PRACTICE_SEC, M1_FALL_DISTANCE, M1_ASTEROID_INTERVAL_MS, M1_BLOB_SPEED, MISSION_GOAL_COUNTS,
} from '../config/balance.js';
import { predicateJudge } from '../logic/judges.js';
import { furnaceStageAt } from '../logic/furnace.js';
import { MISSION_TEXT } from '../data/copy.js';

const SPAWN_Y = -60;
const rand = (a, b) => a + Math.random() * (b - a);

export default class M1FurnaceScene extends BaseMissionScene {
  constructor() {
    super('m1');
    this.showGauge = false;
  }

  buildPhases() {
    return [
      {
        id: 'm1',
        judge: null, // practice: hits only mark the blob
        collisions: false,
        instruction: '연습! ' + MISSION_TEXT.m1.instruction,
      },
      {
        id: 'm1',
        judge: predicateJudge(t => t.colorKey === 'white'),
        remaining: s => MISSION_GOAL_COUNTS.m1 - s.phaseHits,
      },
    ];
  }

  onPhaseStart(phase) {
    this.phaseMs = 0;
    this.asteroidAcc = 0;
    if (this.phaseIndex === 1) {
      this.toast('이제 진짜예요! 흰색일 때만 쏘고, 부딪히면 선체 온도가 올라가요.', { tone: 'info' });
    }
  }

  spawnObject() {
    this.spawnStar({
      x: rand(70, GAME_WIDTH - 70),
      y: SPAWN_Y,
      colorKey: 'white',
      kind: 'furnace',
      scale: rand(0.9, 1.3),
      glow: 0.7,
      vy: rand(M1_BLOB_SPEED.min, M1_BLOB_SPEED.max),
    });
  }

  onMissionUpdate(dt) {
    // Cooling: stage follows the distance fallen; colorKey is what heat and the judge read.
    for (const o of this.pools.stars.members) {
      if (!o.active || o.kind !== 'furnace' || o.marked) continue;
      this.setObjectColor(o, furnaceStageAt((o.y - SPAWN_Y) / M1_FALL_DISTANCE));
    }
    if (this.phaseDone) return;
    this.phaseMs += dt;
    if (this.phaseIndex === 0) {
      if (this.phaseMs >= M1_PRACTICE_SEC * 1000) this.completePhase();
    } else {
      this.asteroidAcc += dt;
      if (this.asteroidAcc >= M1_ASTEROID_INTERVAL_MS) {
        this.asteroidAcc = 0;
        this.spawnAsteroid({ x: rand(70, GAME_WIDTH - 70), y: SPAWN_Y, vx: rand(-40, 40), vy: rand(220, 300), scale: rand(0.9, 1.3) });
      }
    }
  }

  onCorrectHit(obj, result) {
    if (result.practice) {
      const white = obj.colorKey === 'white';
      this.toast(white ? '흰색일 때 맞혔어요! 가장 뜨거운 쇳물이에요.' : '이미 식은 쇳물이에요. 흰색일 때 쏴 보세요.', { tone: 'info' });
    }
  }

  onPhaseComplete() {
    if (this.phaseIndex === 0) {
      this.advancePhase();
      return;
    }
    this.completeMission({
      next: 'card',
      nextData: { title: '정리 카드', body: MISSION_TEXT.m1.card, next: 'm2' },
    });
  }
}
