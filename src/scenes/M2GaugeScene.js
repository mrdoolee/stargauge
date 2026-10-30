// Mission 2 — 스타게이지 보정. 2-a: 태양보다 뜨거운 별, 2-b: 태양보다 차가운 별.
// The gauge persists across the two phases (same scene) and resets on an overheat restart.
import BaseMissionScene from './BaseMissionScene.js';
import { GAME_WIDTH } from '../config/game.js';
import { M2_STAR_SPEED, M2_STAR_SCALE, M2_SPAWN_MIN_GAP_X } from '../config/balance.js';
import { predicateJudge } from '../logic/judges.js';
import { pickSpawnColor, spawnXAwayFrom } from '../logic/spawner.js';
import { STAR_COLORS, hotterThanSun, coolerThanSun } from '../logic/temperature.js';
import { MISSION_TEXT } from '../data/copy.js';

// Single place to wire the next mission: Task 8 only has to register scene 'm3'.
const NEXT_AFTER_M2 = 'm3';

const ALL = STAR_COLORS.map(c => c.key);
const PHASE_KEYS = {
  m2a: ['blue', 'blueWhite', 'white', 'yellowWhite'],
  m2b: ALL, // complete when all 7 are filled
};
const rand = (a, b) => a + Math.random() * (b - a);

export default class M2GaugeScene extends BaseMissionScene {
  constructor() {
    super('m2');
    this.sunRef = true;
  }

  gaugePrefill() { return ['yellow']; }

  unfilled(id) {
    return PHASE_KEYS[id].filter(k => !this.gauge.has(k));
  }

  buildPhases() {
    return [
      { id: 'm2a', judge: predicateJudge(t => hotterThanSun(t.colorKey)), remaining: s => s.unfilled('m2a').length },
      { id: 'm2b', judge: predicateJudge(t => coolerThanSun(t.colorKey)), remaining: s => s.unfilled('m2b').length },
    ];
  }

  setupMission() {
    this.lastSpawnX = null;
  }

  onPhaseStart() {
    this.sinceNeeded = 0;
  }

  spawnObject(phase) {
    const needed = this.unfilled(phase.id);
    const colorKey = pickSpawnColor({ needed, all: ALL, sinceNeeded: this.sinceNeeded, rng: Math.random });
    this.sinceNeeded = needed.includes(colorKey) ? 0 : this.sinceNeeded + 1;
    // Size and brightness are random and independent of color. x keeps clear of the previous star.
    const x = spawnXAwayFrom(this.lastSpawnX, { min: 70, max: GAME_WIDTH - 70, minGap: M2_SPAWN_MIN_GAP_X });
    this.lastSpawnX = x;
    this.spawnStar({
      x,
      y: -60,
      colorKey,
      scale: rand(M2_STAR_SCALE.min, M2_STAR_SCALE.max),
      glow: rand(0.25, 1),
      vy: rand(M2_STAR_SPEED.min, M2_STAR_SPEED.max),
      vx: rand(-25, 25),
    });
  }

  onPhaseComplete(phase) {
    if (phase.id === 'm2a') {
      this.advancePhase();
      return;
    }
    this.registry.set('gaugeFinal', this.gauge.filledKeys());
    const next = this.scene.get(NEXT_AFTER_M2) ? NEXT_AFTER_M2 : 'title';
    this.completeMission({
      next: 'card',
      nextData: {
        title: '스타게이지 완성!',
        gauge: ALL,
        body: MISSION_TEXT.m2b.card,
        next,
      },
    });
  }
}
