// Mission 2 — 스타게이지 보정. 2-a: 태양보다 뜨거운 별, 2-b: 태양보다 차가운 별.
// The gauge persists across the two phases (same scene) and resets on an overheat restart.
import BaseMissionScene from './BaseMissionScene.js';
import { M2_STAR_SCALE } from '../config/balance.js';
import { speedFor, aimVelocity, createFormationMemo } from '../logic/speed.js';
import { predicateJudge } from '../logic/judges.js';
import { fillFormationColors } from '../logic/spawner.js';
import { STAR_COLORS, hotterThanSun, coolerThanSun } from '../logic/temperature.js';
import { MISSION_TEXT, BANNER_TEXT } from '../data/copy.js';

// Single place to wire the next mission: Task 8 only has to register scene 'm3'.
const NEXT_AFTER_M2 = 'm3';

const ALL = STAR_COLORS.map(c => c.key);
const PHASE_KEYS = {
  m2a: ['blue', 'blueWhite', 'white', 'yellowWhite'],
  m2b: ALL, // complete when all 7 are filled
};
const HOTTER_KEYS = ALL.filter(hotterThanSun); // 2-a correct range on the gauge
const COOLER_KEYS = ALL.filter(coolerThanSun); // 2-b correct range
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
      { id: 'm2a', judge: predicateJudge(t => hotterThanSun(t.colorKey)), waves: true, gaugeTarget: HOTTER_KEYS, remaining: s => s.unfilled('m2a').length },
      { id: 'm2b', judge: predicateJudge(t => coolerThanSun(t.colorKey)), waves: true, gaugeTarget: COOLER_KEYS, remaining: s => s.unfilled('m2b').length },
    ];
  }

  onPhaseStart() {
    this.formSpeed = createFormationMemo();
    this.sinceNeeded = 0;
    this.formColors = null;
    this.formIndex = -1;
  }

  /** One star per formation slot. Colors are drawn once per formation (needed-color guarantee). */
  spawnObject(phase, slot) {
    if (!slot) return;
    if (slot.formationIndex !== this.formIndex) {
      this.formIndex = slot.formationIndex;
      const r = fillFormationColors({
        slotCount: slot.formationSize, needed: this.unfilled(phase.id), all: ALL,
        sinceNeeded: this.sinceNeeded, rng: Math.random,
      });
      this.formColors = r.colors;
      this.sinceNeeded = r.sinceNeeded;
    }
    const colorKey = this.formColors[slot.slotIndex] ?? ALL[Math.floor(Math.random() * ALL.length)];
    const y = -60;
    const speed = slot.aim ? speedFor('target', this.diff.key, slot.tier)
      : this.formSpeed(slot.formationIndex, () => speedFor('target', this.diff.key, slot.tier)); // one per formation
    let vx = slot.vx;
    let vy = speed;
    if (slot.aim) ({ vx, vy } = aimVelocity({ x: slot.x, y }, { x: this.ship.x, y: this.ship.y }, speed));
    // Size and brightness are random and independent of color.
    this.spawnStar({
      x: slot.x, y, colorKey, vx, vy, zigzag: slot.zigzag,
      scale: rand(M2_STAR_SCALE.min, M2_STAR_SCALE.max),
      glow: rand(0.25, 1),
    });
  }

  onPhaseComplete(phase) {
    if (phase.id === 'm2a') {
      // Clear the field, then a centre banner while the gauge's correct range slides from the hot side to the cool side.
      this.startTransition({
        ...BANNER_TEXT.m2,
        instruction: MISSION_TEXT.m2b.instruction,
        gaugeTarget: { from: HOTTER_KEYS, to: COOLER_KEYS },
        onDone: () => this.advancePhase(),
      });
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
        ...(next === NEXT_AFTER_M2 && this.scene.get('briefing') ? { next: 'briefing', nextData: { mission: next } } : { next }),
      },
    });
  }
}
