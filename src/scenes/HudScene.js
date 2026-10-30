// HUD overlay scene (key 'hud'). Launched once by the first mission, kept on top
// with bringToTop, slept between missions (cards), woken by the next mission.
//
// EVENT BUS: `this.game.events` (the game-wide emitter). The HUD never reads mission
// state; it only reacts to these events (payloads):
//   'instruction'   string                                 mission instruction line
//   'goal-changed'  { remaining: number|null }             null hides the counter
//   'gauge-changed' { filled: string[], visible: boolean } filled STAR_COLORS keys
//   'heat-changed'  { value, max, ratio }                  hull heat (ratio 0..1)
//   'sun-ref'       boolean                                show the 태양 marker (mission 2+)
//   'toast'         { text, colorKey?, ladder?: 'star'|'furnace', tone?: 'wrong'|'info'|'alert' }
//   'mission-start' { key }                                scene key the pause button pauses
//   'mission-end'   { key }
// The HUD emits 'hud-ready' at the end of create(); missions answer by re-emitting their
// full state (so nothing is lost when the HUD's create runs a frame after the mission's).
// Pause = overlay stack: pause button pauses the mission scene and pushes the overlay;
// '계속하기' pops it and resumes. Mute only toggles registry 'muted' (sound = Task 12).

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { HUD_SAFE_MARGIN, TOAST_MS } from '../config/balance.js';
import { STAR_COLORS, FURNACE_STAGES } from '../logic/temperature.js';
import { createGaugeView, FONT } from '../objects/gaugeView.js';

const M = HUD_SAFE_MARGIN;
const BTN = 72;
const TXT = { fontFamily: FONT, fontSize: '28px', color: '#e8ecff' };
const PANEL_H = 248;

// Gauge geometry (720 wide): 7 x 64 cells + 6 x 6 gaps = 484 → starts at x 118.
const CELL_W = 64;
const CELL_H = 40;
const GAP = 6;
const GAUGE_Y = 116;

export const HUD_EVENTS = [
  'instruction', 'goal-changed', 'gauge-changed', 'heat-changed', 'sun-ref', 'toast', 'mission-start', 'mission-end',
];

export default class HudScene extends Phaser.Scene {
  constructor() {
    super('hud');
  }

  init() {
    this.activeKey = null;
    this.paused = false;
  }

  create() {
    // Top panel behind the HUD so falling stars don't fight the text.
    this.add.rectangle(0, 0, GAME_WIDTH, PANEL_H, 0x05070f, 0.72).setOrigin(0);

    this.createButtons();
    this.createHeatBar();
    this.createGauge();
    this.createInstruction();
    this.createToast();
    this.createPauseOverlay();

    this.handlers = {
      instruction: t => this.instruction.setText(t ?? ''),
      'goal-changed': g => this.setGoal(g?.remaining ?? null),
      'gauge-changed': g => {
        this.gauge.setFilled(g?.filled ?? []);
        for (const o of this.gaugeObjects) o.setVisible(g?.visible !== false);
        this.sunMarker.setVisible(this.sunOn && g?.visible !== false);
      },
      'heat-changed': h => this.setHeat(h?.ratio ?? 0),
      'sun-ref': on => {
        this.sunOn = !!on;
        this.sunMarker.setVisible(this.sunOn && this.gaugeObjects[0].visible);
      },
      toast: t => this.showToast(t),
      'mission-start': m => {
        this.activeKey = m?.key ?? null;
      },
      'mission-end': () => {
        this.closePause(false);
        this.hideToast();
        this.activeKey = null;
      },
    };
    for (const ev of HUD_EVENTS) this.game.events.on(ev, this.handlers[ev], this);
    this.events.once('shutdown', () => {
      for (const ev of HUD_EVENTS) this.game.events.off(ev, this.handlers[ev], this);
    });

    this.game.events.emit('hud-ready');
  }

  // ---- widgets -------------------------------------------------------------

  makeButton(x, y, draw, onPress) {
    const g = this.add.graphics();
    const paint = () => {
      g.clear();
      g.fillStyle(0x1a2238, 0.9);
      g.fillRoundedRect(x, y, BTN, BTN, 14);
      g.lineStyle(3, 0x8fd3ff, 1);
      g.strokeRoundedRect(x, y, BTN, BTN, 14);
      draw(g, x, y);
    };
    paint();
    const zone = this.add.zone(x, y, BTN, BTN).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', (p, lx, ly, ev) => {
      ev?.stopPropagation?.();
      onPress();
      paint();
    });
    return { g, zone, paint };
  }

  createButtons() {
    this.makeButton(M, M, (g, x, y) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(x + 24, y + 20, 8, 32);
      g.fillRect(x + 40, y + 20, 8, 32);
    }, () => this.openPause());

    const mx = GAME_WIDTH - M - BTN;
    this.makeButton(mx, M, (g, x, y) => {
      const muted = !!this.registry.get('muted');
      g.fillStyle(0xffffff, 1);
      g.fillRect(x + 16, y + 28, 12, 16);
      g.fillTriangle(x + 26, y + 36, x + 40, y + 18, x + 40, y + 54);
      g.lineStyle(4, muted ? 0xff6b5a : 0xffffff, 1);
      if (muted) {
        g.lineBetween(x + 46, y + 26, x + 62, y + 46);
        g.lineBetween(x + 62, y + 26, x + 46, y + 46);
      } else {
        g.beginPath();
        g.arc(x + 42, y + 36, 12, -0.9, 0.9);
        g.strokePath();
        g.beginPath();
        g.arc(x + 42, y + 36, 20, -0.9, 0.9);
        g.strokePath();
      }
    }, () => this.registry.set('muted', !this.registry.get('muted')));
  }

  createHeatBar() {
    const left = M + BTN + 16;
    const right = GAME_WIDTH - M - BTN - 16;
    const cy = M + BTN / 2;
    this.add.text(left, cy, '선체 온도', TXT).setOrigin(0, 0.5);
    const barX = left + 140;
    this.heatBarW = right - barX;
    this.add.rectangle(barX, cy, this.heatBarW, 28, 0x2a3048).setOrigin(0, 0.5).setStrokeStyle(2, 0x8890a8);
    this.heatFill = this.add.rectangle(barX, cy, 0, 28, 0xff6b3a).setOrigin(0, 0.5);
  }

  setHeat(ratio) {
    const r = Math.max(0, Math.min(1, ratio));
    this.heatFill.setSize(this.heatBarW * r, 28);
    this.heatFill.fillColor = r > 0.75 ? 0xff3b30 : r > 0.4 ? 0xff8a2e : 0xffc23a;
  }

  createGauge() {
    const width = 7 * CELL_W + 6 * GAP;
    const x0 = (GAME_WIDTH - width) / 2;
    this.gauge = createGaugeView(this, { x: x0, y: GAUGE_Y, cellW: CELL_W, cellH: CELL_H, gap: GAP });
    const cy = GAUGE_Y + CELL_H / 2;
    this.gaugeObjects = [
      ...this.gauge.objects,
      this.add.text(x0 - 12, cy, '높다', TXT).setOrigin(1, 0.5),
      this.add.text(x0 + width + 12, cy, '낮다', TXT).setOrigin(0, 0.5),
      this.add.text(GAME_WIDTH / 2, GAUGE_Y + CELL_H + 70, '표면 온도', TXT).setOrigin(0.5),
    ];

    // Sun reference under the yellow (황색) cell.
    const sx = this.gauge.cellCenterX('yellow');
    const top = GAUGE_Y + CELL_H + 6;
    const mg = this.add.graphics();
    mg.fillStyle(0xffd23f, 1);
    mg.fillTriangle(sx, top, sx - 9, top + 12, sx + 9, top + 12);
    const label = this.add.text(sx, top + 30, '태양', { ...TXT, color: '#ffd23f' }).setOrigin(0.5);
    this.sunMarker = this.add.container(0, 0, [mg, label]).setVisible(false);
    this.sunOn = false;
  }

  createInstruction() {
    const y = PANEL_H + 12;
    this.instructionBg = this.add.rectangle(0, PANEL_H, GAME_WIDTH, 96, 0x05070f, 0.5).setOrigin(0);
    this.instruction = this.add.text(M, y, '', {
      ...TXT,
      fontSize: '30px',
      color: '#ffffff',
      wordWrap: { width: GAME_WIDTH - 2 * M - 140, useAdvancedWrap: true },
      lineSpacing: 4,
    });
    this.goalLabel = this.add.text(GAME_WIDTH - M, y, '남은 목표', TXT).setOrigin(1, 0);
    this.goalValue = this.add
      .text(GAME_WIDTH - M, y + 36, '', { ...TXT, fontSize: '40px', fontStyle: 'bold', color: '#8fd3ff' })
      .setOrigin(1, 0);
    this.setGoal(null);
  }

  setGoal(remaining) {
    const show = remaining !== null && remaining !== undefined;
    this.goalLabel.setVisible(show);
    this.goalValue.setVisible(show).setText(show ? String(remaining) : '');
  }

  createToast() {
    const y = PANEL_H + 120;
    this.toastBg = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 2 * M, 80, 0x2a1020, 0.92)
      .setOrigin(0.5, 0)
      .setStrokeStyle(3, 0xff8a7a);
    this.toastText = this.add
      .text(GAME_WIDTH / 2, y + 14, '', {
        ...TXT,
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 2 * M - 32, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0);
    this.toastLadder = this.add.graphics();
    this.toast = this.add.container(0, 0, [this.toastBg, this.toastText, this.toastLadder]).setVisible(false);
    this.toastTimer = null;
  }

  /** Hide any visible toast and cancel its timer (a late toast must not reappear in the next mission). */
  hideToast() {
    this.toastTimer?.remove(false);
    this.toastTimer = null;
    this.tweens.killTweensOf(this.toast);
    this.toast.setVisible(false);
  }

  showToast({ text = '', colorKey = null, ladder = null, tone = 'wrong' } = {}) {
    this.toastText.setText(text);
    let h = this.toastText.height + 28;
    this.toastLadder.clear();

    // Tiny color ladder (hot → cool) with the shot color circled.
    const steps = ladder === 'furnace' ? FURNACE_STAGES : ladder === 'star' ? STAR_COLORS : null;
    if (steps) {
      const w = 44;
      const gap = 6;
      const total = steps.length * w + (steps.length - 1) * gap;
      const x0 = (GAME_WIDTH - total) / 2;
      const ly = this.toastBg.y + h - 6;
      steps.forEach((c, i) => {
        const lx = x0 + i * (w + gap);
        this.toastLadder.fillStyle(c.hex, 1);
        this.toastLadder.fillRect(lx, ly, w, 20);
        if (c.key === colorKey) {
          this.toastLadder.lineStyle(4, 0xffffff, 1);
          this.toastLadder.strokeRect(lx - 4, ly - 4, w + 8, 28);
        }
      });
      h += 34;
    }

    const stroke = tone === 'info' ? 0x8fd3ff : tone === 'alert' ? 0xffd23f : 0xff8a7a;
    this.toastBg.setStrokeStyle(3, stroke);
    this.toastBg.setSize(this.toastBg.width, h);
    this.toast.setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.toastTimer?.remove(false);
    this.toastTimer = this.time.delayedCall(TOAST_MS, () => {
      this.tweens.add({ targets: this.toast, alpha: 0, duration: 250, onComplete: () => this.toast.setVisible(false) });
    });
  }

  // ---- pause overlay (screen stack: gameplay → pause) ------------------------

  createPauseOverlay() {
    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setOrigin(0).setInteractive();
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.38, '일시정지', { ...TXT, fontSize: '56px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5);
    const resume = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.52, '계속하기', {
        ...TXT,
        fontSize: '44px',
        color: '#05070f',
        backgroundColor: '#8fd3ff',
        padding: { x: 56, y: 20 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    resume.on('pointerdown', () => this.closePause(true));
    this.pauseOverlay = this.add.container(0, 0, [dim, title, resume]).setDepth(100).setVisible(false);
  }

  openPause() {
    if (this.paused || !this.activeKey || !this.scene.isActive(this.activeKey)) return;
    this.paused = true;
    this.scene.pause(this.activeKey);
    this.pauseOverlay.setVisible(true);
  }

  closePause(resume) {
    if (!this.paused) return;
    this.paused = false;
    this.pauseOverlay.setVisible(false);
    if (resume && this.activeKey) this.scene.resume(this.activeKey);
  }
}
