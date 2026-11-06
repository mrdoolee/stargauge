// Mission 4 — 보스 함선. Shooting a star MEASURES it (never destroyed) and charges the beam with its color.
// The boss ship (not a star: it can be shot down) wears color armor that gets hotter each stage; only a charge at
// least as hot as the armor pierces it. The boss cycles attack -> gap (bullets only in the attack window).
// Timeout is NOT failure: the boss flies away. After the fight: two choice questions, then a bar chart of the
// star colors the student measured. All inside this scene.
import Phaser from 'phaser';
import BaseMissionScene from './BaseMissionScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { ENEMY_TEX } from '../objects/starTextures.js';
import {
  M4_TIME_LIMIT_SEC, M3_STAR_SCALE, M3_DECOY_SCALE, M4_STAR_POOL, BLOCKED_TOAST_MAX, BOSS_POS, BOSS_SWAY, BOSS_HIT_FLASH_MS,
  TRANSITION_CLEAR_MS, BOSS_WIDTH_PX, BOSS_MUZZLE_DY, BOSS_AIMED_FROM_STAGE, WARMUP_MS,
  DRONE_HP, DRONE_SPEED_X, DRONE_MUZZLE_DY, BOSS_ESCORT_BAND_Y, BOSS_ESCORT_RESPAWN_MS, BOSS_ESCORT_FIRST_MS, BOSS_ESCORT_FIRE_MS,
} from '../config/balance.js';
import { createRank } from '../logic/rank.js';
import { speedFor, aimVelocity, createFormationMemo } from '../logic/speed.js';
import { fillFormationColors } from '../logic/spawner.js';
import { bossArmorColor, piercingColors, pickShieldColor } from '../logic/charge.js';
import { droneShot } from '../logic/drones.js';
import {
  bossCycle, bossWarmup, bossStageFromHp, bossShotSpeed, stageChangeVolleyMs, bossVolleyMs, bossHp, bossFan, escortTarget, BOSS_STAGES,
  fanVelocities, angleToward, swayOffset, formatTime,
} from '../logic/boss.js';
import { STAR_COLORS } from '../logic/temperature.js';
import { MISSION_TEXT, BANNER_TEXT } from '../data/copy.js';
import { FONT } from '../objects/gaugeView.js';
import { armButton } from '../ui/button.js';
import { bgm } from '../audio/bgm.js';

// Next scene after the chart: 'report' once it is registered, else the title.
const NEXT_AFTER_M4 = 'report';
const D = 40;
const ALL_COLOR_KEYS = STAR_COLORS.map(c => c.key);
const STAGES = BOSS_STAGES;
const DECOY_KEYS = ['red', 'orange'];
const ESCORT_ENTRY_SPEED = 170; // px/s while flying in from the side (the m3 drones' DRONE_ENTRY_SPEED)
const ESCORT_ENTRY_X = 40; // spawns this far outside the screen edge
const ESCORT_MIN_X = 70;
const ESCORT_MAX_X = GAME_WIDTH - 70;
const GAP_TINT = 0x8fa0c8;
const HIT_TINT = 0xff9a9a;
const GAP_TOAST_MAX = 2; // "지금이 기회!" shows for the first gaps of each stage only
const FLEE_MS = TRANSITION_CLEAR_MS; // the boss is gone before the flee banner appears
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
      hideGoal: s => s.bossDown || s.timedOut, // no counter once the fight is over
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
    this.escortWaitMs = BOSS_ESCORT_FIRST_MS; // escorts only exist in stages that want them (escortTarget)
    this._escortBuf = [];
    this.measured = Object.fromEntries(ALL_COLOR_KEYS.map(k => [k, 0]));
    const restarts = this.registry.get('results')?.[this.missionId]?.restarts ?? 0;
    this.rank = createRank({ diffKey: this.diff.key, restarts });
    // warm-up: the first volley waits one (sparser) interval instead of firing on frame 1
    this.volleyMs = bossWarmup(0, false, bossVolleyMs(1, this.diff.key)).intervalMs;
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
      x: BOSS_POS.x, y: BOSS_POS.y, shieldKey: bossArmorColor(1, this.diff.key), hp: bossHp(1, this.diff.key),
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
        slotCount: slot.formationSize, needed: piercingColors(this.boss.shieldKey), all: M4_STAR_POOL,
        sinceNeeded: this.sinceNeeded, rng: Math.random,
      });
      this.formColors = r.colors;
      this.sinceNeeded = r.sinceNeeded;
    }
    const colorKey = this.formColors[slot.slotIndex] ?? M4_STAR_POOL[Math.floor(Math.random() * M4_STAR_POOL.length)];
    const y = -60;
    const speed = this.formSpeed(slot.formationIndex, () => speedFor('target', this.diff.key, slot.tier)); // one per formation
    let vx = slot.vx;
    let vy = speed;
    if (slot.aim) ({ vx, vy } = aimVelocity({ x: slot.x, y }, { x: this.ship.x, y: this.ship.y }, speed));
    // Red/orange decoys are drawn big and bright (as in m3); size and brightness never change the charge, color decides.
    const decoy = DECOY_KEYS.includes(colorKey);
    this.spawnStar({
      x: slot.x, y, colorKey, vx, vy, zigzag: slot.aim ? null : slot.zigzag,
      scale: decoy ? rand(M3_DECOY_SCALE.min, M3_DECOY_SCALE.max) : rand(M3_STAR_SCALE.min, M3_STAR_SCALE.max),
      glow: decoy ? rand(0.9, 1) : rand(0.3, 0.5),
    });
  }

  onStarMeasured(obj) {
    if (obj.colorKey in this.measured) this.measured[obj.colorKey] += 1;
  }

  onEnemyBlocked(enemy, beamKey) {
    if (enemy.kind === 'boss') this.flashBoss();
    if (this.blockedHits <= BLOCKED_TOAST_MAX) {
      this.toast(beamKey ? '빔이 약해요. 장갑과 같거나\n더 뜨거운 색의 별로 충전하세요.' : '먼저 별을 맞혀 빔을 충전해요!', { tone: 'info' });
    }
  }

  /** Every pierce: rank +1; at hp 0 the next stage starts (keep the boss alive) until the last one. */
  onEnemyPierced(enemy, res) {
    if (enemy.kind !== 'boss') return false; // an escort drone: only its own hp bar changes (the engine handles it)
    this.rank.onCorrect();
    this.director?.onCorrect();
    this.resetBossScale(enemy); // a pulse cut short by an earlier hit must not leave the boss bigger
    if (res.hp > 0) {
      this.flashBoss();
      this.emitBoss();
      return false;
    }
    const next = bossStageFromHp({ stage: this.stage, hp: res.hp, diffKey: this.diff.key });
    if (next.cleared) return false; // the engine explodes it, then onEnemyDown
    this.stage = next.stage;
    this.stageMs = 0;
    this.gapToasts = 0;
    this.volleyMs = stageChangeVolleyMs(this.stage, this.diff.key); // no volley until one full interval has passed
    if (this.escortWaitMs > BOSS_ESCORT_FIRST_MS) this.escortWaitMs = BOSS_ESCORT_FIRST_MS; // the new stage's escorts arrive soon
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

  onEnemyDown(enemy) {
    if (enemy.kind !== 'boss') { // an escort drone shot down: counts like an m3 drone for the tension rank, nothing else
      this.rank.onCorrect();
      this.director?.onCorrect();
      this.escortWaitMs = BOSS_ESCORT_RESPAWN_MS;
      return;
    }
    this.bossDown = true;
    this.boss = null;
    this.releaseEscorts();
    this.emitBoss(false);
    this.emitGoal(); // hides the counter the boss gauge just gave back
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

  /** Escort drones in a reused buffer (no per-frame allocation); valid until the next call. */
  activeEscorts() {
    const buf = this._escortBuf;
    buf.length = 0;
    for (const e of this.pools.enemies.members) if (e.active && e.kind === 'drone') buf.push(e);
    return buf;
  }

  /** The boss fell or fled: the escorts leave at once (released, no explosion, no down). */
  releaseEscorts() {
    for (const e of this.activeEscorts()) this.releaseEnemy(e);
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
      this.updateEscorts(dt);
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
    const { attacking, gapJustStarted } = bossCycle(this.stage, this.stageMs, prev, this.diff.key);
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
    const w = bossWarmup(this.elapsed, aimOk, bossVolleyMs(this.stage, this.diff.key));
    this.volleyMs = w.intervalMs;
    this.fireVolley(boss, w.aim);
  }

  fireVolley(boss, aim) {
    const ship = { x: this.ship.x, y: this.ship.y };
    const from = { x: boss.x, y: boss.y + BOSS_MUZZLE_DY };
    const speed = bossShotSpeed({ fromY: from.y, shipY: ship.y, diffKey: this.diff.key, tier: this.rank.tier });
    if (speed === null) return; // the ship is right under the muzzle: no shot it could not react to
    const shots = [];
    const fan = bossFan(this.stage, this.diff.key); // null in stage 1: one straight shot
    if (!fan) {
      shots.push(...fanVelocities(aim ? angleToward(from, ship) : 0, 1, 0, speed));
    } else {
      shots.push(...fanVelocities(aim ? angleToward(from, ship) : 0, randInt(fan.count[0], fan.count[1]),
        fan.spreadDeg, speed));
      if (this.stage >= BOSS_AIMED_FROM_STAGE && aim) shots.push(aimVelocity(from, ship, speed));
    }
    for (const v of shots) this.spawnBullet({ x: from.x, y: from.y, vx: v.vx, vy: v.vy });
  }

  // ---- escort drones (the m3 drone code path: spawnEnemy kind 'drone', pickShieldColor, droneShot) ----
  updateEscorts(dt) {
    const list = this.activeEscorts();
    for (const d of list) this.updateEscort(d, dt);
    if (list.length >= escortTarget(this.stage, this.diff.key)) return;
    this.escortWaitMs -= dt;
    if (this.escortWaitMs > 0) return;
    this.escortWaitMs = BOSS_ESCORT_FIRST_MS; // a second escort (hard stage 3) follows after this
    this.spawnEscort();
  }

  /** Flies in from a side edge at a hover row below the boss hull (never through it), then patrols sideways. */
  spawnEscort() {
    const fromLeft = Math.random() < 0.5;
    const e = this.spawnEnemy({
      x: fromLeft ? -ESCORT_ENTRY_X : GAME_WIDTH + ESCORT_ENTRY_X, y: rand(BOSS_ESCORT_BAND_Y.min, BOSS_ESCORT_BAND_Y.max),
      vx: fromLeft ? ESCORT_ENTRY_SPEED : -ESCORT_ENTRY_SPEED, vy: 0, hp: DRONE_HP, hpBar: true,
      scale: ENEMY_TEX / this.textures.get('drone').getSourceImage().width,
      shieldKey: pickShieldColor(this.diff.key),
    });
    if (!e) return;
    e.dir = fromLeft ? 1 : -1;
    e.entering = true;
    e.fireMs = BOSS_ESCORT_FIRE_MS[this.diff.key] * rand(0.6, 1);
  }

  updateEscort(d, dt) {
    if (d.entering) {
      if (d.x < ESCORT_MIN_X || d.x > ESCORT_MAX_X) return; // still flying in (velocity set at spawn)
      d.entering = false;
    }
    if (d.x <= ESCORT_MIN_X) d.dir = 1;
    else if (d.x >= ESCORT_MAX_X) d.dir = -1;
    d.body.setVelocity(d.dir * DRONE_SPEED_X, 0);
    d.fireMs -= dt;
    if (d.fireMs > 0) return;
    d.fireMs = BOSS_ESCORT_FIRE_MS[this.diff.key];
    const shot = droneShot({
      drone: { x: d.x, y: d.y }, ship: { x: this.ship.x, y: this.ship.y }, diffKey: this.diff.key,
      tier: this.rank.tier, aimAllowed: this.rank.aimAllowed, warmup: this.elapsed < WARMUP_MS,
    });
    if (shot) this.spawnBullet({ x: d.x, y: d.y + DRONE_MUZZLE_DY, vx: shot.vx, vy: shot.vy });
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
    this.emitGoal();
    this.releaseEscorts();
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
    bgm.request('a'); // the fight is over: calm track for the questions
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
      fontFamily: FONT, fontSize: '36px', color: '#ffffff', align: 'center',
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
      fontFamily: FONT, fontSize: '44px', color: '#ffffff', align: 'center', lineSpacing: 14,
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
      fontFamily: FONT, fontSize: '46px', color: '#8fd3ff',
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
        fontFamily: FONT, fontSize: '30px', color: '#ffffff',
      }).setOrigin(0.5, 1));
      this.addUi(this.add.text(x + barW / 2, baseY + 14, d.label, {
        fontFamily: FONT, fontSize: '22px', color: '#ffffff',
      }).setOrigin(0.5, 0));
    });

    const msg = total > 0
      ? '청색에 가까운 별일수록\n표면 온도가 높고,\n빔을 더 세게 충전해요.'
      : '별을 맞혀 충전하면 색별 개수가 여기에 나타나요.';
    this.addUi(this.add.text(cx, 840, msg, {
      fontFamily: FONT, fontSize: '36px', color: '#ffffff', align: 'center', lineSpacing: 10,
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
