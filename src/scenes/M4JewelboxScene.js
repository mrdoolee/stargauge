// Mission 4 — 보석상자 성단 (boss). Mark all 12 cluster stars within the time limit; the huge red
// supergiant (boss) is the COOLEST, the small blue stars are the hottest. Color alone decides temperature.
// Cluster = persistent targets swaying near the top. Scattered blue stars fly down (not targetable, hot).
// Timeout is NOT failure: unmarked stars are revealed and each counts as one wrong shot for scoring.
// After the cluster: two choice questions, then a color-count bar chart. All inside this scene.
import Phaser from 'phaser';
import BaseMissionScene from './BaseMissionScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import {
  M4_TIME_LIMIT_SEC, M4_SCATTER_INTERVAL_MS, M4_SCATTER_SPEED, M4_SCATTER_SCALE,
  M4_CLUSTER_AREA, M4_SWAY, M4_STAR_SCALE,
} from '../config/balance.js';
import { predicateJudge } from '../logic/judges.js';
import { colorByKey } from '../logic/temperature.js';
import { colorCounts, swayOffset, clusterPosition, unmarkedMisses, formatTime } from '../logic/jewelbox.js';
import { JEWELBOX, JEWELBOX_NOTE } from '../data/stars.js';
import { MISSION_TEXT } from '../data/copy.js';
import { FONT } from '../objects/gaugeView.js';

// Next scene after the chart: 'report' once it is registered, else the title.
const NEXT_AFTER_M4 = 'report';
const TAIL = '온도는 색으로 비교해요.';
const REVEAL_MS = 2600;
const D = 40;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const QUESTIONS = [
  {
    id: 'q1',
    text: '이 성단에 가장 많은 별의 색은?',
    choices: ['청색·청백색', '황색', '적색'],
    correct: '청색·청백색',
    right: '맞아요! 이 성단에는 청색·청백색 별이 가장 많아요.',
    wrong: `이 성단에는 청색·청백색 별이 가장 많아요. 청색에 가까울수록 표면 온도가 높아요. ${TAIL}`,
  },
  {
    id: 'q2',
    text: '붉은 초거성은 크기가 가장 크다.\n그럼 표면 온도도 가장 높을까?',
    choices: ['아니다, 적색이라 낮다', '그렇다, 크니까 높다'],
    correct: '아니다, 적색이라 낮다',
    right: `맞아요! 크기가 커도 적색이면 표면 온도는 낮아요. ${TAIL}`,
    wrong: `아니에요. 붉은 초거성은 아주 크지만 적색이라 표면 온도가 낮아요. ${TAIL}`,
  },
];

export default class M4JewelboxScene extends BaseMissionScene {
  constructor() {
    super('m4');
    this.sunRef = true; // gauge starts empty; the sun marker still helps compare colors
  }

  buildPhases() {
    const scene = this;
    return [{
      id: 'm4',
      judge: predicateJudge(() => true), // every cluster star is a correct target
      remaining: s => s.members.filter(m => !m.obj.marked).length,
      spawnIntervalMs: M4_SCATTER_INTERVAL_MS,
      get instruction() {
        return `${MISSION_TEXT.m4.instruction} (남은 시간 ${formatTime(scene.timeLeft ?? M4_TIME_LIMIT_SEC)})`;
      },
    }];
  }

  setupMission() {
    this.elapsed = 0;
    this.timeLeft = M4_TIME_LIMIT_SEC;
    this._shownSec = Math.ceil(this.timeLeft);
    this.timedOut = false;
    this.members = [];
    JEWELBOX.forEach((s, i) => {
      const boss = !!s.isSupergiant;
      const base = clusterPosition(s, M4_CLUSTER_AREA);
      const obj = this.spawnStar({
        x: base.x, y: base.y, colorKey: s.colorKey, scale: s.size * M4_STAR_SCALE, glow: s.glow,
        persistent: true, keepOnMark: true, collides: boss, starId: s.id, name: boss ? '붉은 초거성' : '',
        depth: boss ? 9 : 10,
      });
      if (!obj) return;
      obj.haloAlpha = obj.halo.alpha;
      this.members.push({
        obj, base, star: s, boss,
        amp: boss ? M4_SWAY.bossAmp : M4_SWAY.amp,
        period: boss ? M4_SWAY.bossPeriodMs : M4_SWAY.periodMs,
        phase: i * 1.3,
      });
    });
    this.toast('흩어지는 청색 별은 아주 뜨거워요. 부딪히지 않게 피하세요.', { tone: 'info' });
  }

  spawnObject() {
    // A small blue star leaves the cluster and flies down. Not targetable (beams pass), hot on contact.
    const src = pick(this.members.filter(m => !m.boss && m.star.colorKey === 'blue')) ?? this.members[0];
    if (!src) return;
    const vy = rand(M4_SCATTER_SPEED.min, M4_SCATTER_SPEED.max);
    const vx = Phaser.Math.Clamp((this.ship.x - src.obj.x) * 0.25, -120, 120) + rand(-30, 30);
    this.spawnStar({
      x: src.obj.x, y: src.obj.y + 30, colorKey: 'blue', scale: M4_SCATTER_SCALE, glow: 0.9,
      vx, vy, targetable: false, depth: 11,
    });
  }

  onMissionUpdate(dt) {
    this.elapsed += dt;
    for (const m of this.members) {
      m.obj.body.reset(m.base.x + swayOffset(this.elapsed, m.amp, m.period, m.phase), m.base.y);
    }
    if (this.timedOut || this.phaseDone) return;
    this.timeLeft = Math.max(0, M4_TIME_LIMIT_SEC - this.elapsed / 1000);
    const sec = Math.ceil(this.timeLeft);
    if (sec !== this._shownSec) {
      this._shownSec = sec;
      this.setInstruction(this.currentInstruction());
    }
    if (this.timeLeft <= 0) this.timeout();
  }

  onPhaseComplete() {
    this.toast('성단의 별을 모두 표시했어요!', { tone: 'info' });
    this.endGameplay();
    this.time.delayedCall(1200, () => this.startQuestions());
  }

  /** Time is up: not a failure. Reveal what is left, count each unmarked star as one wrong shot. */
  timeout() {
    if (this.timedOut || this.phaseDone || this.restarting || this.finished) return;
    this.timedOut = true;
    this.phaseDone = true;
    const left = this.members.filter(m => !m.obj.marked);
    this.wrongShots += unmarkedMisses(this.members.map(m => m.obj));
    this.endGameplay();
    this.toast('시간이 다 됐어요. 남은 별의 색을 보여 줄게요.', { tone: 'info' });
    this.revealLabels = [];
    for (const m of left) {
      if (this.gauge.fill(m.star.colorKey)) this.emitGauge();
      const t = this.add.text(m.obj.x, m.obj.y + m.obj.displayHeight * 0.32 + 6,
        colorByKey(m.star.colorKey).label, {
          fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#ffe27a',
          stroke: '#05070f', strokeThickness: 6,
        }).setOrigin(0.5, 0).setDepth(18);
      this.revealLabels.push(t);
      const s = (m.obj.displayWidth / 128) * 1.1;
      const ring = this.add.image(m.obj.x, m.obj.y, 'fx-ring').setDepth(15).setScale(s).setTint(0xffe27a);
      this.tweens.add({ targets: ring, scale: s * 1.6, alpha: 0, duration: 900, repeat: 1 });
    }
    this.time.delayedCall(REVEAL_MS, () => this.startQuestions());
  }

  // ---- questions + chart -------------------------------------------------------------
  startQuestions() {
    if (this.finished || this.restarting) return;
    for (const s of this.pools.stars.members) this.releaseObject(s);
    for (const b of this.pools.beams.members) this.releaseObject(b);
    this.revealLabels?.forEach(t => t.destroy());
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
    const r = this.addUi(this.add.rectangle(x, y, w, 96, fill, 1).setStrokeStyle(3, 0xffffff, 0.4)
      .setInteractive({ useHandCursor: true }));
    this.addUi(this.add.text(x, y, label, {
      fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#ffffff', align: 'center',
    }).setOrigin(0.5), D + 2);
    r.on('pointerup', () => onTap(r));
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
      this.button(cx, 540 + k * 130, 560, c, 0x2b3a5c, r => {
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
    const cx = GAME_WIDTH / 2;
    this.addUi(this.add.text(cx, 90, '보석상자 성단의 별 색깔', {
      fontFamily: FONT, fontSize: '46px', fontStyle: 'bold', color: '#8fd3ff',
    }).setOrigin(0.5));

    const data = colorCounts(JEWELBOX);
    const baseY = 700;
    const unit = 70;
    const barW = 100;
    const gap = 40;
    const total = data.length * barW + (data.length - 1) * gap;
    const x0 = cx - total / 2;
    const g = this.addUi(this.add.graphics());
    g.lineStyle(3, 0x6f86b3, 0.8);
    g.lineBetween(x0 - 20, baseY, x0 + total + 20, baseY);
    data.forEach((d, k) => {
      const x = x0 + k * (barW + gap);
      const h = d.count * unit;
      g.fillStyle(d.hex, 1);
      g.fillRect(x, baseY - h, barW, h);
      this.addUi(this.add.text(x + barW / 2, baseY - h - 10, `${d.count}개`, {
        fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5, 1));
      this.addUi(this.add.text(x + barW / 2, baseY + 14, d.label, {
        fontFamily: FONT, fontSize: '30px', color: '#ffffff',
      }).setOrigin(0.5, 0));
    });

    this.addUi(this.add.text(cx, 840, '청색 별이 많은 성단은 비교적 젊은 성단이에요.', {
      fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#ffffff', align: 'center', lineSpacing: 10,
      wordWrap: { width: GAME_WIDTH - 100, useAdvancedWrap: true },
    }).setOrigin(0.5, 0));
    this.addUi(this.add.text(cx, 985, `※ ${JEWELBOX_NOTE}`, {
      fontFamily: FONT, fontSize: '22px', color: '#7f8db0',
    }).setOrigin(0.5));
    this.addUi(this.add.text(cx, 1025, '참고: NSF NOIRLab 「Jewels of the Night」', {
      fontFamily: FONT, fontSize: '22px', color: '#7f8db0',
    }).setOrigin(0.5));

    const next = this.scene.get(NEXT_AFTER_M4) ? NEXT_AFTER_M4 : 'title';
    let leaving = false;
    this.button(cx, 1150, 320, '다음', 0x3c6fa8, () => {
      if (leaving) return;
      leaving = true;
      this.scene.start(next);
    });
  }
}
