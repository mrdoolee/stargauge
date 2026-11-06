// Mission 4 — 보스 함선. Shooting a star MEASURES it (never destroyed) and charges the beam with its color.
// The boss ship (not a star: it can be shot down) wears color armor that gets hotter each stage; only a charge at
// least as hot as the armor pierces it. The boss cycles attack -> gap (bullets only in the attack window).
// Timeout is NOT failure: the boss flies away. After the fight: two choice questions, then a bar chart of the
// star colors the student measured. All inside this scene.
import Phaser from 'phaser';
import BaseMissionScene from './BaseMissionScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import {
  M4_TIME_LIMIT_SEC, M3_STAR_SCALE, BLOCKED_TOAST_MAX, BOSS_HP, BOSS_POS, BOSS_SWAY, BOSS_HIT_FLASH_MS,
  BOSS_WIDTH_PX, BOSS_MUZZLE_DY, BOSS_VOLLEY_MS, BOSS_FAN,
} from '../config/balance.js';
import { scaleInterval } from '../logic/difficulty.js';
import { createRank } from '../logic/rank.js';
import { speedFor, aimVelocity, createFormationMemo } from '../logic/speed.js';
import { fillFormationColors } from '../logic/spawner.js';
import { bossArmorColor, piercingColors } from '../logic/charge.js';
import { bossCycle, bossWarmup, bossStageFromHp, bossShotSpeed, stageChangeVolleyMs, fanVelocities, angleToward, swayOffset, formatTime } from '../logic/boss.js';
import { STAR_COLORS } from '../logic/temperature.js';
import { MISSION_TEXT, BANNER_TEXT } from '../data/copy.js';
import { FONT } from '../objects/gaugeView.js';
import { armButton } from '../ui/button.js';

// Next scene after the chart: 'report' once it is registered, else the title.
const NEXT_AFTER_M4 = 'report';
const D = 40;
const ALL_COLOR_KEYS = STAR_COLORS.map(c => c.key);
const STAGES = BOSS_HP.length;
const GAP_TINT = 0x8fa0c8;
const HIT_TINT = 0xff9a9a;
const GAP_TOAST_MAX = 2; // "지금이 기회!" shows for the first gaps of each stage only
const FLEE_MS = 1400;
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const rand = (a, b) => a + Math.random() * (b - a);

const QUESTIONS = [
  {
    id: 'q1',
    text: '가장 강한 충전을 주는\n별의 색은?',
    choices: ['청색', '백색', '적색'],
    correct: '청색',
    right: '맞아요! 청색 별이 표면 온도가\n가장 높아서 가장 강하게 충전돼요.',
    wrong: '아니에요. 청색 별이 표면 온도가\n가장 높아서 가장 강하게 충전돼요.',
  },
  {
    id: 'q2',
    text: '크고 밝은 적색 별로 충전하면 빔이 약했던 이유는?',
    choices: ['적색 별은 표면 온도가 낮아서', '별이 너무 커서', '별이 너무 밝아서'],
    correct: '적색 별은 표면 온도가 낮아서',
    right: '맞아요! 크기나 밝기가 아니라\n색이 표면 온도를 알려 줘요.',
    wrong: '아니에요. 크기나 밝기가 아니라\n색이 표면 온도를 알려 줘요.\n적색은 온도가 낮아요.',
  },
];

export default class M4BossScene extends BaseMissionScene {
  constructor() {
    super('m4');
    this.sunRef = true;
    this.showGauge = true; // HUD charge cell
  }

  buildPhases() {
    const scene = this;
    return [{
      id: 'm4', chargeMode: true, waves: true, blockedToast: false,
      remaining: s => (s.bossDown ? 0 : STAGES - s.stage + 1), // boss stages left
      get instruction() {
        return `${MISSION_TEXT.m4.instruction} (${formatTime(scene.timeLeft ?? M4_TIME_LIMIT_SEC)})`;
      },
    }];
  }

  setupMission() {
    this.elapsed = 0;
    this.timeLeft = M4_TIME_LIMIT_SEC;
    this._shownSec = Math.ceil(this.timeLeft);
    this.timedOut = false;
    this.bossDown = false;
    this.boss = null;
    this.stage = 1;
    this.stageMs = 0;
    this.gapTint = false;
    this.gapToasts = 0;
    this.measured = Object.fromEntries(ALL_COLOR_KEYS.map(k => [k, 0]));
    const restarts = this.registry.get('results')?.[this.missionId]?.restarts ?? 0;
    this.rank = createRank({ diffKey: this.diff.key, restarts });
    // warm-up: the first volley waits one (sparser) interval instead of firing on frame 1
    this.volleyMs = bossWarmup(0, false, scaleInterval(BOSS_VOLLEY_MS[1], this.diff.key)).intervalMs;
    // A restart / leaving the scene must not leave the HUD gauge up.
    this.events.once('shutdown', () => this.game.events.emit('boss-changed', { visible: false }));
  }

  /** HUD boss gauge. Visible only while the boss is on screen and fighting. */
  emitBoss(visible = !!this.boss?.active && !this.bossDown && !this.timedOut) {
    const b = this.boss;
    this.game.events.emit('boss-changed', visible && b ? {
      visible: true, stage: this.stage, stages: STAGES, hp: b.hp, maxHp: b.maxHp, armorKey: b.shieldKey,
    } : { visible: false });
  }

  emitHudState() {
    super.emitHudState();
    this.emitBoss();
  }

  onPhaseStart() {
    this.formSpeed = createFormationMemo();
    this.sinceNeeded = 0;
    this.formColors = null;
    this.formIndex = -1;
    const tex = this.textures.get('boss').getSourceImage();
    const boss = this.spawnEnemy({
      x: BOSS_POS.x, y: BOSS_POS.y, shieldKey: bossArmorColor(1, this.diff.key), hp: BOSS_HP[0],
      kind: 'boss', texture: 'boss', scale: BOSS_WIDTH_PX / tex.width,
    });
    if (boss) {
      boss.clearTint();
      boss.baseScale = BOSS_WIDTH_PX / tex.width; // the stage-change pulse always returns to this
    }
    this.boss = boss;
    this.emitBoss();
    this.toast('별을 쏴서 빔을 충전하고,\n뜨거운 색일수록 센 충전!', { tone: 'info' });
  }

  /** One star per formation slot; colors drawn once per formation so a piercing color keeps coming. */
  spawnObject(_phase, slot) {
    if (!slot || !this.boss?.active) return;
    if (slot.formationIndex !== this.formIndex) {
      this.formIndex = slot.formationIndex;
      const r = fillFormationColors({
        slotCount: slot.formationSize, needed: piercingColors(this.boss.shieldKey), all: ALL_COLOR_KEYS,
        sinceNeeded: this.sinceNeeded, rng: Math.random,
      });
      this.formColors = r.colors;
      this.sinceNeeded = r.sinceNeeded;
    }
    const colorKey = this.formColors[slot.slotIndex] ?? ALL_COLOR_KEYS[Math.floor(Math.random() * ALL_COLOR_KEYS.length)];
    const y = -60;
    const speed = this.formSpeed(slot.formationIndex, () => speedFor('target', this.diff.key, slot.tier)); // one per formation
    let vx = slot.vx;
    let vy = speed;
    if (slot.aim) ({ vx, vy } = aimVelocity({ x: slot.x, y }, { x: this.ship.x, y: this.ship.y }, speed));
    this.spawnStar({
      x: slot.x, y, colorKey, vx, vy, zigzag: slot.aim ? null : slot.zigzag,
      scale: rand(M3_STAR_SCALE.min, M3_STAR_SCALE.max), glow: rand(0.3, 0.5), // size and brightness never change the charge
    });
  }

  onStarMeasured(obj) {
    if (obj.colorKey in this.measured) this.measured[obj.colorKey] += 1;
  }

  onEnemyBlocked(_enemy, beamKey) {
    this.flashBoss();
    if (this.blockedHits <= BLOCKED_TOAST_MAX) {
      this.toast(beamKey ? '빔이 약해요. 장갑과 같거나\n더 뜨거운 색의 별로 충전하세요.' : '먼저 별을 맞혀 빔을 충전해요!', { tone: 'info' });
    }
  }

  /** Every pierce: rank +1; at hp 0 the next stage starts (keep the boss alive) until the last one. */
  onEnemyPierced(enemy, res) {
    this.rank.onCorrect();
    this.director?.onCorrect();
    this.resetBossScale(enemy); // a pulse cut short by an earlier hit must not leave the boss bigger
    if (res.hp > 0) {
      this.flashBoss();
      this.emitBoss();
      return false;
    }
    const next = bossStageFromHp({ stage: this.stage, hp: res.hp });
    if (next.cleared) return false; // the engine explodes it, then onEnemyDown
    this.stage = next.stage;
    this.stageMs = 0;
    this.gapToasts = 0;
    this.volleyMs = stageChangeVolleyMs(this.stage, this.diff.key); // no volley until one full interval has passed
    enemy.hp = next.hp;
    enemy.maxHp = next.hp;
    this.setEnemyShield(enemy, bossArmorColor(this.stage, this.diff.key));
    this.emitBoss(); // new stage: full gauge, new armor color cell
    this.releaseBullets();
    this.cameras.main.flash(90, 255, 255, 255); // short: it must not hide bullets
    this.toast('장갑이 더 뜨거운 색으로 바뀌었어요!', { tone: 'info', priority: true });
    const k = enemy.baseScale ?? enemy.scaleX;
    this.tweens.add({
      targets: enemy, scaleX: k * 1.12, scaleY: k * 1.12, duration: 160, yoyo: true,
      onComplete: () => this.resetBossScale(enemy),
    });
    return true;
  }

  /** Stop the stage-change pulse and put the boss (and its body) back to its base scale. */
  resetBossScale(enemy) {
    this.tweens.killTweensOf(enemy); // also cuts a hit-flash alpha tween, so restore alpha too
    enemy.setAlpha(1);
    if (enemy.baseScale) enemy.setScale(enemy.baseScale);
  }

  onEnemyDown() {
    this.bossDown = true;
    this.boss = null;
    this.emitBoss(false);
  }

  flashBoss() {
    const b = this.boss;
    if (!b?.active) return;
    b.setTint(HIT_TINT);
    this.time.delayedCall(BOSS_HIT_FLASH_MS, () => this.applyBossTint());
  }

  applyBossTint() {
    const b = this.boss;
    if (!b?.active) return;
    if (this.gapTint) b.setTint(GAP_TINT);
    else b.clearTint();
  }

  releaseBullets() {
    for (const b of this.pools.bullets.members) if (b.active) this.releaseObject(b);
  }

  // ---- boss (the engine does not steer enemies) -----------------------------------------
  onMissionUpdate(dt) {
    if (this.phaseDone || this.finished || !this.playing) return;
    this.elapsed += dt;
    this.rank.update(dt);
    const b = this.boss;
    if (b?.active) {
      b.body.reset(BOSS_POS.x + swayOffset(this.elapsed, BOSS_SWAY.amp, BOSS_SWAY.periodMs), BOSS_POS.y);
      this.updateAttack(b, dt);
    }
    this.timeLeft = Math.max(0, M4_TIME_LIMIT_SEC - this.elapsed / 1000);
    const sec = Math.ceil(this.timeLeft);
    if (sec !== this._shownSec) {
      this._shownSec = sec;
      this.setInstruction(this.currentInstruction());
    }
    if (this.timeLeft <= 0) this.timeout();
  }

  /** Attack window -> gap cycle of the current stage; volleys only while attacking. */
  updateAttack(boss, dt) {
    const prev = this.stageMs;
    this.stageMs += dt;
    const { attacking, gapJustStarted } = bossCycle(this.stage, this.stageMs, prev);
    if (gapJustStarted && !this.gapTint) {
      this.gapTint = true;
      this.applyBossTint();
      if (this.gapToasts < GAP_TOAST_MAX) { // non-color cue; only the first gaps of a stage (not every 9 s)
        this.gapToasts += 1;
        this.toast('지금이 기회!', { tone: 'info' });
      }
    } else if (attacking && this.gapTint) {
      this.gapTint = false;
      this.applyBossTint();
    }
    if (!attacking) {
      this.volleyMs = 0;
      return;
    }
    this.volleyMs -= dt;
    if (this.volleyMs > 0) return;
    const aimOk = this.rank.aimAllowed && this.diff.key !== 'easy';
    const w = bossWarmup(this.elapsed, aimOk, scaleInterval(BOSS_VOLLEY_MS[this.stage], this.diff.key));
    this.volleyMs = w.intervalMs;
    this.fireVolley(boss, w.aim);
  }

  fireVolley(boss, aim) {
    const ship = { x: this.ship.x, y: this.ship.y };
    const from = { x: boss.x, y: boss.y + BOSS_MUZZLE_DY };
    const speed = bossShotSpeed({ fromY: from.y, shipY: ship.y, diffKey: this.diff.key, tier: this.rank.tier });
    if (speed === null) return; // the ship is right under the muzzle: no shot it could not react to
    const shots = [];
    if (this.stage === 1) {
      shots.push(...fanVelocities(aim ? angleToward(from, ship) : 0, 1, 0, speed));
    } else {
      const fan = BOSS_FAN[this.stage];
      shots.push(...fanVelocities(aim ? angleToward(from, ship) : 0, randInt(fan.count[0], fan.count[1]),
        fan.spreadDeg, speed));
      if (this.stage === 3 && aim) shots.push(aimVelocity(from, ship, speed));
    }
    for (const v of shots) this.spawnBullet({ x: from.x, y: from.y, vx: v.vx, vy: v.vy });
  }

  // ---- end of the fight ------------------------------------------------------------------
  onPhaseComplete() {
    if (this.timedOut) return;
    this.endFight(BANNER_TEXT.m4Win);
  }

  /** Time is up: not a failure. The boss flies away, then the questions. */
  timeout() {
    if (this.timedOut || this.phaseDone || this.restarting || this.finished) return;
    this.timedOut = true;
    this.phaseDone = true;
    this.emitBoss(false);
    const b = this.boss;
    if (b?.active) {
      b.body.setVelocity(0, 0);
      this.tweens.add({ targets: b, y: -300, duration: FLEE_MS, ease: 'Sine.easeIn' });
    }
    this.endFight(BANNER_TEXT.m4Flee);
  }

  /** Clear the field (no judging), then the centre banner, then the questions: the shared stage transition (capped update dt). */
  endFight(banner) {
    this.startTransition({ ...banner, onDone: () => { this.endGameplay(); this.startQuestions(); } });
  }

  // ---- questions + chart -------------------------------------------------------------
  startQuestions() {
    if (this.finished || this.restarting) return;
    for (const s of this.pools.stars.members) if (s.active) this.releaseObject(s);
    for (const b of this.pools.beams.members) if (b.active) this.releaseObject(b);
    for (const e of this.pools.enemies.members) if (e.active) this.releaseEnemy(e);
    this.releaseBullets();
    this.completeMission(); // writes results.m4 (stars/wrongShots/restarts) and sleeps the HUD
    this.answers = [];
    this.ui = [];
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05070f, 1).setDepth(D);
    this.askQuestion(0);
  }

  clearUi() {
    this.ui.forEach(o => o.destroy());
    this.ui = [];
  }

  addUi(o, depth = D + 1) {
    this.ui.push(o.setDepth(depth));
    return o;
  }

  button(x, y, w, label, fill, onTap) {
    const r = this.addUi(this.add.rectangle(x, y, w, 96, fill, 1).setStrokeStyle(3, 0xffffff, 0.4));
    this.addUi(this.add.text(x, y, label, {
      fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#ffffff', align: 'center',
      wordWrap: { width: w - 24, useAdvancedWrap: true },
    }).setOrigin(0.5), D + 2);
    armButton(r, () => onTap(r)); // a press that started on it, >= 300 ms after it appeared
    return r;
  }

  askQuestion(i) {
    const q = QUESTIONS[i];
    this.clearUi();
    const cx = GAME_WIDTH / 2;
    this.addUi(this.add.text(cx, 130, `질문 ${i + 1} / ${QUESTIONS.length}`, {
      fontFamily: FONT, fontSize: '32px', color: '#8fd3ff',
    }).setOrigin(0.5));
    this.addUi(this.add.text(cx, 330, q.text, {
      fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: '#ffffff', align: 'center', lineSpacing: 14,
      wordWrap: { width: GAME_WIDTH - 100, useAdvancedWrap: true },
    }).setOrigin(0.5));

    const choices = Phaser.Utils.Array.Shuffle([...q.choices]);
    const feedback = this.addUi(this.add.text(cx, 870, '', {
      fontFamily: FONT, fontSize: '32px', color: '#ffffff', align: 'center', lineSpacing: 10,
      wordWrap: { width: GAME_WIDTH - 100, useAdvancedWrap: true },
    }).setOrigin(0.5, 0));
    let answered = false;
    choices.forEach((c, k) => {
      this.button(cx, 540 + k * 130, 600, c, 0x2b3a5c, r => {
        if (answered) return;
        answered = true;
        const ok = c === q.correct;
        r.setFillStyle(ok ? 0x1f8a5b : 0xb04545);
        feedback.setText(ok ? q.right : q.wrong).setColor(ok ? '#9ff0c8' : '#ffb4a8');
        this.answers.push({ id: q.id, choice: c, correct: ok });
        this.button(cx, 1150, 320, i + 1 < QUESTIONS.length ? '다음 질문' : '결과 보기', 0x3c6fa8, () => {
          if (i + 1 < QUESTIONS.length) this.askQuestion(i + 1);
          else this.showChart();
        });
      });
    });
  }

  showChart() {
    this.clearUi();
    this.updateResult({ questions: this.answers });
    this.registry.set('measuredCounts', { ...this.measured });
    const cx = GAME_WIDTH / 2;
    this.addUi(this.add.text(cx, 90, '내가 측정한 별의 색', {
      fontFamily: FONT, fontSize: '46px', fontStyle: 'bold', color: '#8fd3ff',
    }).setOrigin(0.5));

    const data = STAR_COLORS.map(c => ({ ...c, count: this.measured[c.key] ?? 0 })); // textbook order, hottest first
    const total = data.reduce((n, d) => n + d.count, 0);
    const baseY = 700;
    const maxCount = Math.max(1, ...data.map(d => d.count));
    const unit = Math.min(70, 400 / maxCount);
    const barW = 72;
    const gap = 16;
    const width = data.length * barW + (data.length - 1) * gap;
    const x0 = cx - width / 2;
    const g = this.addUi(this.add.graphics());
    g.lineStyle(3, 0x6f86b3, 0.8);
    g.lineBetween(x0 - 20, baseY, x0 + width + 20, baseY);
    data.forEach((d, k) => {
      const x = x0 + k * (barW + gap);
      const h = d.count * unit;
      g.fillStyle(d.hex, 1);
      g.fillRect(x, baseY - h, barW, h);
      this.addUi(this.add.text(x + barW / 2, baseY - h - 8, `${d.count}개`, {
        fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5, 1));
      this.addUi(this.add.text(x + barW / 2, baseY + 14, d.label, {
        fontFamily: FONT, fontSize: '22px', color: '#ffffff',
      }).setOrigin(0.5, 0));
    });

    const msg = total > 0
      ? '청색에 가까운 별일수록\n표면 온도가 높고,\n빔을 더 세게 충전해요.'
      : '별을 맞혀 충전하면 색별 개수가 여기에 나타나요.';
    this.addUi(this.add.text(cx, 840, msg, {
      fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#ffffff', align: 'center', lineSpacing: 10,
      wordWrap: { width: GAME_WIDTH - 100, useAdvancedWrap: true },
    }).setOrigin(0.5, 0));

    const next = this.scene.get(NEXT_AFTER_M4) ? NEXT_AFTER_M4 : 'title';
    let leaving = false;
    this.button(cx, 1150, 320, '다음', 0x3c6fa8, () => {
      if (leaving) return;
      leaving = true;
      this.scene.start(next);
    });
  }
}
