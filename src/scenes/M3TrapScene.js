// Mission 3 — 밝기의 함정. 3-a: 세 별 중 가장 뜨거운 별(리겔), 3-b: 온도 높은 순서(리겔 → 시리우스 → 베텔게우스).
// Betelgeuse is drawn biggest and Sirius brightest (decoys); the answer is read from COLOR only.
// A slowly drifting "constellation group" (Orion + Sirius) holds the three targets; nameless big bright
// red trap stars fall in formation slots from both sides; the group sways left <-> right and a trap is only
// spawned when its whole flight (zigzag included) stays clear of the group's predicted box. The last stage is the constellation picture (same scene).
import Phaser from 'phaser';
import BaseMissionScene from './BaseMissionScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { MISSION_GOAL_COUNTS, M3_SWAY, FORMATION_GAP_WINDOW_MS } from '../config/balance.js';
import { scaleSpeed } from '../logic/difficulty.js';
import { speedFor, aimVelocity, createFormationMemo } from '../logic/speed.js';
import { orderedJudge, predicateJudge } from '../logic/judges.js';
import { sortHottestFirst, colorByKey } from '../logic/temperature.js';
import {
  toScreen, advanceGroup, groupSprites, groupExtent, groupSwayX, groupBox, isTrapPathClear, trapKeepsEscapeGap,
  GROUP_SCALE, SPRITE_HALF, STAR_PX, BG_PX, TRAP_SCALE,
} from '../logic/constellation.js';
import { NAMED_STARS, ORION_BACKGROUND, CONSTELLATION_POS } from '../data/stars.js';
import { FONT } from '../objects/gaugeView.js';
import { drawOrionFigure, BELT } from '../objects/orionFigure.js';
import { armButton } from '../ui/button.js';

// Single place to wire the next mission: Task 9 only has to register scene 'm4'.
const NEXT_AFTER_M3 = 'm4';

// Sprites relative to originX 0; the sway amplitude comes from their extent (whole group always on screen).
const SPRITES = groupSprites(0);
const SWAY = { extent: groupExtent(SPRITES), screenW: GAME_WIDTH, periodMs: M3_SWAY.periodMs };
const TRAP_HALF = SPRITE_HALF * TRAP_SCALE.max;
const SHIP_WIDTH = 64;
const TRAP_Y0 = -80;
const PREDICT_STEP_MS = 50;
const GROUP_HEIGHT = 1.65 * GROUP_SCALE;
const GROUP_SPEED = 45; // px/s
const GROUP_MARGIN = 120;
const PHASE_PAUSE_MS = 800;

const rand = (a, b) => a + Math.random() * (b - a);
const trueOrder = () => sortHottestFirst(Object.values(NAMED_STARS)); // rigel, sirius, betelgeuse
const colorLabel = key => colorByKey(key).label;

export default class M3TrapScene extends BaseMissionScene {
  constructor() {
    super('m3');
    this.showGauge = false;
  }

  buildPhases() {
    const order = trueOrder();
    const hottest = order[0];
    const ordered = orderedJudge(order.map(s => s.id));
    // Trap stars have no id; return undefined for named stars so the spec wording applies.
    const trapMsg = t => (t.id ? undefined
      : '크고 밝아 보여도 적색이라 표면 온도가 낮아요. 온도는 색으로 비교해요.');
    return [
      {
        id: 'm3a',
        waves: true,
        waveBounds: { minX: 60, maxX: GAME_WIDTH - 60 },
        judge: predicateJudge(t => t.id === hottest.id),
        remaining: s => MISSION_GOAL_COUNTS.m3a - s.phaseHits,
        fillGauge: false,
        wrongMessage: trapMsg,
      },
      {
        id: 'm3b',
        waves: true,
        waveBounds: { minX: 60, maxX: GAME_WIDTH - 60 },
        judge: ordered,
        remaining: () => order.length - ordered.progress,
        fillGauge: false,
        wrongMessage: trapMsg,
      },
    ];
  }

  onPhaseStart() {
    this.formSpeed = createFormationMemo(); // formation indices restart each phase
  }

  setupMission() {
    this.groupY = 60;
    this.swayMs = 0; // elapsed mission time driving the sway
    this.recentTraps = []; // accepted traps as escape-gap slots (delayMs = spawn time)
    this.members = []; // { obj, norm, label, star }
    this.taggedIds = [];
    this.tagCount = 0;
    this.buildGroup();
  }

  buildGroup() {
    const origin = { x: groupSwayX(this.swayMs, SWAY), y: this.groupY };
    for (const b of ORION_BACKGROUND) {
      const p = toScreen(b, origin, GROUP_SCALE);
      const obj = this.spawnStar({
        x: p.x, y: p.y, colorKey: b.colorKey, scale: b.size * BG_PX, glow: b.glow,
        targetable: false, collides: false, persistent: true, starId: b.id, depth: 6,
      });
      if (!obj) continue;
      obj.setAlpha(0.6);
      this.members.push({ obj, norm: b, label: null, star: null });
    }
    for (const s of Object.values(NAMED_STARS)) {
      const norm = CONSTELLATION_POS[s.id];
      const p = toScreen(norm, origin, GROUP_SCALE);
      const obj = this.spawnStar({
        x: p.x, y: p.y, colorKey: s.colorKey, scale: s.size * STAR_PX, glow: s.glow,
        persistent: true, keepOnMark: true, starId: s.id, name: s.name, depth: 10,
      });
      if (!obj) continue;
      obj.haloAlpha = obj.halo.alpha;
      const label = this.add.text(0, 0, s.name, {
        fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#ffffff',
        stroke: '#05070f', strokeThickness: 6,
      }).setOrigin(0.5, 0).setDepth(18);
      this.members.push({ obj, norm, label, star: s });
    }
  }

  onPhaseStart(phase) {
    // Fresh targets for each phase: a star marked in 3-a (Rigel) is shootable again in 3-b.
    for (const m of this.members) {
      if (!m.star) continue;
      this.tweens.killTweensOf(m.obj);
      this.tweens.killTweensOf(m.obj.halo);
      m.obj.marked = false;
      m.obj.targetable = true;
      m.obj.setAlpha(1);
      m.obj.halo.setAlpha(m.obj.haloAlpha);
      m.label.setText(m.star.name);
    }
    this.tagCount = 0;
    this.taggedIds = [];
    if (phase.id === 'm3b') {
      this.toast('이번에는 세 별을 모두, 표면 온도가 높은 순서대로 쏘세요.', { tone: 'info' });
    }
  }

  groupDrift() {
    return { speed: scaleSpeed(GROUP_SPEED, this.diff.key), height: GROUP_HEIGHT, screenH: GAME_HEIGHT, margin: GROUP_MARGIN };
  }

  /** Group box `ahead` ms from now (sway + vertical drift, wrap included). */
  predictBox(ahead) {
    let y = this.groupY;
    for (let k = PREDICT_STEP_MS; k <= ahead; k += PREDICT_STEP_MS) y = advanceGroup(y, PREDICT_STEP_MS, this.groupDrift());
    return groupBox(groupSwayX(this.swayMs + ahead, SWAY), y, SPRITES, GROUP_HEIGHT);
  }

  /** One nameless big, bright RED trap per formation slot, only if its flight stays clear of the group. */
  spawnObject(_phase, slot) {
    if (!slot || !this.members?.length) return;
    const now = this.swayMs;
    const speed = slot.aim ? speedFor('hazard', this.diff.key, slot.tier)
      : this.formSpeed(slot.formationIndex, () => speedFor('hazard', this.diff.key, slot.tier)); // one per formation
    let vx = slot.vx;
    let vy = speed;
    let zigzag = slot.zigzag;
    if (slot.aim) {
      ({ vx, vy } = aimVelocity({ x: slot.x, y: TRAP_Y0 }, { x: this.ship.x, y: this.ship.y }, speed));
      zigzag = null;
    }
    const clear = isTrapPathClear({ x: slot.x, vx, vy, y0: TRAP_Y0, t0Ms: now, zigzag },
      t => this.predictBox(t - now), { trapHalf: TRAP_HALF, screenH: GAME_HEIGHT });
    if (!clear) return;
    this.recentTraps = this.recentTraps.filter(r => now - r.delayMs <= FORMATION_GAP_WINDOW_MS);
    const cand = { delayMs: now, x: slot.x, zigzag };
    if (!trapKeepsEscapeGap(this.recentTraps, cand, { trapHalf: TRAP_HALF, shipWidth: SHIP_WIDTH, screenW: GAME_WIDTH })) return;
    this.recentTraps.push(cand);
    // Size and brightness never affect judging: big, bright and red stay as the decoy.
    this.spawnStar({
      x: slot.x, y: TRAP_Y0, colorKey: 'red', scale: rand(TRAP_SCALE.min, TRAP_SCALE.max), glow: 1,
      vx, vy, zigzag, depth: 8,
    });
  }

  onMissionUpdate(dt) {
    if (!this.members?.length || this.finished) return;
    this.swayMs += dt;
    this.groupY = advanceGroup(this.groupY, dt, this.groupDrift());
    const origin = { x: groupSwayX(this.swayMs, SWAY), y: this.groupY };
    for (const m of this.members) {
      const p = toScreen(m.norm, origin, GROUP_SCALE);
      m.obj.body.reset(p.x, p.y);
    }
  }

  onLateUpdate() {
    for (const m of this.members ?? []) {
      if (!m.label) continue;
      const half = m.label.displayWidth / 2 + 8; // keep the label fully on screen
      m.label.setPosition(Phaser.Math.Clamp(m.obj.x, half, GAME_WIDTH - half), m.obj.y + m.obj.displayHeight * 0.32 + 6);
    }
  }

  onCorrectHit(obj, result, phase) {
    if (phase.id !== 'm3b') return;
    this.tagCount += 1;
    this.taggedIds.push(obj.starId);
    const m = this.members.find(x => x.obj === obj);
    if (m?.label) m.label.setText(`${this.tagCount}. ${m.star.name}`);
  }

  onPhaseComplete(phase) {
    if (phase.id === 'm3a') {
      this.time.delayedCall(PHASE_PAUSE_MS, () => {
        if (!this.restarting && !this.finished) this.advancePhase();
      });
      return;
    }
    this.endGameplay();
    this.time.delayedCall(PHASE_PAUSE_MS, () => this.showPicture());
  }

  // ---- completion picture -----------------------------------------------------------
  showPicture() {
    if (this.finished || this.restarting) return;
    const tagged = [...this.taggedIds];
    this.registry.set('orionTagged', tagged);
    for (const s of this.pools.stars.members) this.releaseObject(s);
    for (const b of this.pools.beams.members) this.releaseObject(b);
    for (const m of this.members) m.label?.setVisible(false);
    this.completeMission(); // writes results.m3 and sleeps the HUD; no scene change here

    const D = 40;
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05070f, 1).setDepth(D);
    this.add.text(cx, 90, '오리온자리와 시리우스', {
      fontFamily: FONT, fontSize: '46px', fontStyle: 'bold', color: '#8fd3ff',
    }).setOrigin(0.5).setDepth(D + 1);

    const { pos, items } = drawOrionFigure(this, { box: { x: 100, y: 270, w: 520, h: 560 }, depth: D + 1, tagged });
    for (const { p, x, y, size, hi } of items) {
      if (BELT.includes(p.id)) continue; // the three belt stars share one label below
      const big = p.id === 'betelgeuse'; // its label goes left of the big ring, clear of the belt
      this.add.text(big ? x - size * 62 : x, big ? y : y + (hi ? 30 + size * 52 : 22 + size * 36),
        big ? `${p.name} ${colorLabel(p.colorKey)}` : `${p.name}\n${colorLabel(p.colorKey)}`, {
          fontFamily: FONT, fontSize: hi ? '28px' : '22px', fontStyle: hi ? 'bold' : 'normal',
          color: hi ? '#ffe27a' : '#9fb0d0', align: 'center', stroke: '#05070f', strokeThickness: 5,
        }).setOrigin(big ? 1 : 0.5, big ? 0.5 : 0).setDepth(D + 3);
    }

    this.add.text(pos.alnilam.x, pos.alnilam.y + 34, '허리띠 세 별 (청색)', {
      fontFamily: FONT, fontSize: '22px', color: '#9fb0d0', align: 'center', stroke: '#05070f', strokeThickness: 5,
    }).setOrigin(0.5, 0).setDepth(D + 3);

    this.add.text(cx, 965, '별마다 색이 다른 까닭은 표면 온도가 다르기 때문이에요.', {
      fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#ffffff', align: 'center',
      lineSpacing: 10, wordWrap: { width: GAME_WIDTH - 120, useAdvancedWrap: true },
    }).setOrigin(0.5, 0).setDepth(D + 3);
    this.add.text(cx, 1085, '별자리 모양은 단순하게 그렸어요.', {
      fontFamily: FONT, fontSize: '22px', color: '#7f8db0',
    }).setOrigin(0.5).setDepth(D + 3);

    const next = this.scene.get(NEXT_AFTER_M3) ? NEXT_AFTER_M3 : 'title';
    let leaving = false;
    const nextBtn = this.add.text(cx, 1170, '다음', {
      fontFamily: FONT, fontSize: '44px', color: '#05070f', backgroundColor: '#8fd3ff',
      padding: { x: 80, y: 22 },
    }).setOrigin(0.5).setDepth(D + 3);
    // The steering finger may still be down when the picture appears: only a fresh press counts.
    armButton(nextBtn, () => {
      if (leaving) return;
      leaving = true;
      if (next === 'm4' && this.scene.get('briefing')) this.scene.start('briefing', { mission: 'm4' });
      else this.scene.start(next);
    });
  }
}
