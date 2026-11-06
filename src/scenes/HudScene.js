// HUD overlay scene (key 'hud'). Launched once by the first mission, kept on top
// with bringToTop, slept between missions (cards), woken by the next mission.
//
// EVENT BUS: `this.game.events` (the game-wide emitter). The HUD never reads mission
// state; it only reacts to these events (payloads):
//   'instruction'   string                                 mission instruction line
//   'goal-changed'  { remaining: number|null }             null hides the counter
//   'gauge-changed' { filled: string[], visible: boolean } filled STAR_COLORS keys
//   'heat-changed'  { value, max, ratio }                  hull heat (ratio 0..1)
//   'charge-changed' { colorKey: string|null }             beam charge: that gauge cell gets a bright border + "빔 충전" label; null clears
//   'boss-changed'  { visible: boolean, stage: 1..3, stages: 3, hp, maxHp, armorKey: string|null }  m4 boss gauge in the instruction strip's
//                     right slot (it replaces the "남은 목표" counter while visible): neutral white fill = hp/maxHp, armor color cell
//                     (exact STAR_COLORS hex), "n/3단계". { visible: false } hides it. Re-emitted on 'hud-ready'.
//   'sun-ref'       boolean                                show the 태양 marker (mission 2+)
//   'toast'         { text, colorKey?, ladder?: 'star'|'furnace', tone?: 'wrong'|'info'|'alert', priority?: boolean }
//                     in-play message: it REPLACES the instruction text in the strip (never a box over the play field) for TOAST_MS,
//                     then the current instruction returns. tone = strip border flash (info/alert/wrong). priority = a plain message
//                     can't replace it for STRIP_HOLD_MS. ladder 'star' = the colorKey cell of the top gauge blinks while the message
//                     shows; ladder 'furnace' = a small 4-colour FURNACE_STAGES ladder in the strip's right slot with colorKey outlined.
//   'banner'        { title: string, body?: string, emphasis?: string, visible: boolean }  big centre banner on a translucent panel
//                     (title ~56 px, body ~40 px, '\n' = line break, the `emphasis` word of the body in the accent colour). Missions send it
//                     only while nothing dangerous moves (stage change, overheat, boss defeated). { visible: false } hides it.
//                     Re-emitted on 'hud-ready'; also hidden on 'mission-end'. Drawn below the pause overlay.
//   'gauge-target'  { keys: string[], animateFrom?: string[] }  bracket over the star-gauge cells that are the correct range ("맞힐 별");
//                     animateFrom = the bracket slides from that range to `keys` (~800 ms). [] hides it. Re-emitted on 'hud-ready'.
//   'mission-start' { key }                                scene key the pause button pauses
//   'mission-end'   { key }
// The HUD emits 'hud-ready' at the end of create(); missions answer by re-emitting their
// full state (so nothing is lost when the HUD's create runs a frame after the mission's).
// Pause = overlay stack: pause button pauses the mission scene and pushes the overlay;
// '계속하기' pops it and resumes. Mute toggles registry 'muted' and sfx.setMuted.
// Returning from the background (game 'hidden' -> 'visible') during live gameplay opens the pause
// overlay, so a student coming back is not dropped into falling stars. If the device is in landscape
// the loop stays asleep behind #rotate (main.js); the queued pause/overlay show once back in portrait.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import {
  HUD_SAFE_MARGIN, HUD_PANEL_H, HUD_INSTRUCTION_H,
} from '../config/balance.js';
import { STAR_COLORS, FURNACE_STAGES } from '../logic/temperature.js';
import { splitEmphasis } from '../logic/transition.js';
import { hpBarFraction } from '../logic/enemyHp.js';
import { stripReducer, stripText, initialStrip } from '../logic/strip.js';
import { createGaugeView, FONT } from '../objects/gaugeView.js';
import { sfx } from '../audio/sfx.js';
import { armButton } from '../ui/button.js';

const M = HUD_SAFE_MARGIN;
const BTN = 72;
const TXT = { fontFamily: FONT, fontSize: '28px', color: '#e8ecff' };
const PANEL_H = HUD_PANEL_H;
const STRIP_TEXT_W = GAME_WIDTH - 2 * M - 140; // left text area; the right ~140 px is the goal counter / boss gauge
const STRIP_FONT = 30;
const STRIP_FONT_SMALL = 26; // one step down when the text would not fit the 96 px strip
const STRIP_TONES = {
  info: { stroke: 0x8fd3ff, text: '#8fd3ff' },
  alert: { stroke: 0xffd23f, text: '#ffd23f' },
  wrong: { stroke: 0xff8a7a, text: '#ffb3a8' },
};
const LADDER_W = 31; // furnace ladder (4 cells) in the strip's top-right: x 560..696, above the goal label
const LADDER_GAP = 3;
const LADDER_Y = PANEL_H + 3;
const LADDER_H = 9;

// Gauge geometry (720 wide): 7 x 64 cells + 6 x 6 gaps = 484 → starts at x 118.
const CELL_W = 64;
const CELL_H = 40;
const GAP = 6;
const GAUGE_Y = 116;

const BANNER_W = 680; // centre banner panel (x 20..700), centred on the screen
const BANNER_PAD = 40;
const BANNER_TITLE_PX = 56;
const BANNER_BODY_PX = 40;
const BANNER_BODY_LINE_H = 56;
const BANNER_BODY_SEGS = 6; // pooled body text pieces: up to 2 lines x 3 pieces (before / emphasis / after)
const BANNER_ACCENT = '#8fd3ff'; // the banner's own UI cyan (never a star/temperature colour)
const TARGET_TWEEN_MS = 800;
const TARGET_COLOR = 0x8fd3ff;

const BOSS_BAR_W = 136; // boss gauge bar: the width of the 남은 목표 slot (x 560..696)
const BOSS_GAUGE_TWEEN_MS = 160;

export const HUD_EVENTS = [
  'instruction', 'goal-changed', 'gauge-changed', 'heat-changed', 'sun-ref', 'toast', 'mission-start', 'mission-end', 'ship-hit',
  'charge-changed', 'boss-changed', 'banner', 'gauge-target',
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
    this.createBossGauge();
    this.createStripFeedback();
    this.createGaugeTarget();
    this.createBanner();
    this.createPauseOverlay();

    this.handlers = {
      instruction: t => this.stripEvent({ type: 'instruction', text: t ?? '' }),
      'goal-changed': g => this.setGoal(g?.remaining ?? null),
      'gauge-changed': g => {
        this.gauge.setFilled(g?.filled ?? []);
        for (const o of this.gaugeObjects) o.setVisible(g?.visible !== false);
        this.gaugeVisible = g?.visible !== false;
        this.setCharge(this.chargeKey);
        this.sunMarker.setVisible(this.sunOn && g?.visible !== false);
        this.syncTargetVisible();
      },
      'heat-changed': h => this.setHeat(h?.ratio ?? 0),
      'sun-ref': on => {
        this.sunOn = !!on;
        this.sunMarker.setVisible(this.sunOn && this.gaugeObjects[0].visible);
      },
      toast: t => this.showToast(t),
      'mission-start': m => {
        if (m?.key !== this.activeKey) for (const b of this.hudButtons) b.rearm(); // a new mission screen
        this.activeKey = m?.key ?? null;
        this.setCharge(null); // a new mission starts uncharged (the mission re-emits its charge right after)
      },
      'charge-changed': c => this.setCharge(c?.colorKey ?? null),
      'boss-changed': b => this.setBoss(b),
      banner: b => this.setBanner(b),
      'gauge-target': t => this.setGaugeTarget(t),
      'ship-hit': () => this.flashHeatBar(),
      'mission-end': () => {
        this.closePause(false);
        this.stripEvent({ type: 'clear' });
        this.setBoss({ visible: false });
        this.setBanner({ visible: false });
        this.setGaugeTarget({ keys: [] });
        this.activeKey = null;
      },
    };
    for (const ev of HUD_EVENTS) this.game.events.on(ev, this.handlers[ev], this);
    // Mute: registry flag is the source of truth; sfx follows it now and on every change.
    sfx.setMuted(!!this.registry.get('muted'));
    this.onMutedChanged = (_p, key, value) => {
      if (key === 'muted') sfx.setMuted(!!value);
    };
    this.registry.events.on('changedata', this.onMutedChanged);
    this.pauseOnReturn = false;
    this.onPageHidden = () => {
      this.pauseOnReturn = this.isGameplayLive();
    };
    this.onPageVisible = () => {
      if (!this.pauseOnReturn) return;
      this.pauseOnReturn = false;
      this.openPause();
    };
    this.game.events.on('hidden', this.onPageHidden);
    this.game.events.on('visible', this.onPageVisible);
    this.events.once('shutdown', () => {
      this.game.events.off('hidden', this.onPageHidden);
      this.game.events.off('visible', this.onPageVisible);
      this.registry.events.off('changedata', this.onMutedChanged);
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
    // Activates on release of a press that started on the button (see ui/button.js).
    const btn = armButton(zone, () => {
      onPress();
      paint();
    }, { stopPropagation: true });
    this.hudButtons.push(btn);
    return { g, zone, paint };
  }

  createButtons() {
    this.hudButtons = [];
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
    }, () => {
      const muted = !this.registry.get('muted');
      this.registry.set('muted', muted);
      sfx.setMuted(muted);
      sfx.unlock();
    });
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

  /** Large tier: the heat bar blinks white-ish for a moment (alpha dip, restored on complete). */
  flashHeatBar() {
    this.tweens.killTweensOf(this.heatFill);
    this.heatFill.setAlpha(1);
    this.tweens.add({
      targets: this.heatFill, alpha: 0.25, duration: 70, yoyo: true, repeat: 1,
      onComplete: () => this.heatFill.setAlpha(1),
    });
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

    // Beam-charge highlight: bright thick border on the charged colour's cell + a small label above it.
    this.chargeBox = this.add.graphics().setVisible(false);
    this.chargeLabel = this.add
      .text(0, GAUGE_Y - 6, '빔 충전', { ...TXT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5, 1)
      .setVisible(false);
    this.chargeKey = null;
    this.gaugeVisible = true;
  }

  /** Highlight the gauge cell of the beam's charge colour (null = none). Hidden together with the gauge. */
  setCharge(colorKey) {
    this.chargeKey = colorKey ?? null;
    const show = !!this.chargeKey && this.gaugeVisible;
    this.chargeBox.clear().setVisible(show);
    this.chargeLabel.setVisible(show);
    if (!show) return;
    const cx = this.gauge.cellCenterX(this.chargeKey);
    const hex = STAR_COLORS.find(c => c.key === this.chargeKey)?.hex;
    if (hex !== undefined) { // the charged cell is filled with the exact palette color (uncharged cells stay dim)
      this.chargeBox.fillStyle(hex, 1);
      this.chargeBox.fillRoundedRect(cx - CELL_W / 2, GAUGE_Y, CELL_W, CELL_H, 8);
    }
    this.chargeBox.lineStyle(7, 0xffffff, 1);
    this.chargeBox.strokeRoundedRect(cx - CELL_W / 2 - 5, GAUGE_Y - 5, CELL_W + 10, CELL_H + 10, 11);
    this.chargeLabel.setX(cx);
  }

  createInstruction() {
    const y = PANEL_H + 12;
    this.instructionBg = this.add.rectangle(0, PANEL_H, GAME_WIDTH, HUD_INSTRUCTION_H, 0x05070f, 0.5).setOrigin(0);
    this.instruction = this.add.text(M, y, '', {
      ...TXT,
      fontSize: '30px',
      color: '#ffffff',
      wordWrap: { width: STRIP_TEXT_W, useAdvancedWrap: true },
      lineSpacing: 4,
    });
    this.goalLabel = this.add.text(GAME_WIDTH - M, y, '남은 목표', TXT).setOrigin(1, 0);
    this.goalValue = this.add
      .text(GAME_WIDTH - M, y + 36, '', { ...TXT, fontSize: '40px', fontStyle: 'bold', color: '#8fd3ff' })
      .setOrigin(1, 0);
    this.setGoal(null);
  }

  /** m4 boss gauge: the right slot of the instruction strip (x 560..696, y < HUD_BAND_BOTTOM). Built once; redrawn only on change. */
  createBossGauge() {
    const right = GAME_WIDTH - M;
    const w = BOSS_BAR_W;
    const y = PANEL_H + 12;
    this.bossBack = this.add.rectangle(right, y + 50, w, 20, 0x2a3048).setOrigin(1, 0).setStrokeStyle(2, 0x8890a8);
    this.bossFill = this.add.rectangle(right - w, y + 50, w, 20, 0xf2f5ff).setOrigin(0, 0); // neutral white, never a palette color
    this.bossArmor = this.add.rectangle(right - w, y + 2, 28, 28, 0xffffff).setOrigin(0, 0).setStrokeStyle(2, 0xffffff);
    this.bossStageText = this.add.text(right, y, '', { ...TXT, fontSize: '26px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(1, 0);
    this.bossObjects = [this.bossBack, this.bossFill, this.bossArmor, this.bossStageText];
    this.bossState = { visible: false, stage: 0, hp: 0, maxHp: 1, armorKey: null };
    this.bossFrac = { v: 0 };
    for (const o of this.bossObjects) o.setVisible(false);
  }

  setBoss(b) {
    const visible = !!b?.visible;
    const st = this.bossState;
    if (!visible) {
      if (!st.visible) return;
      st.visible = false;
      this.tweens.killTweensOf(this.bossFrac);
      for (const o of this.bossObjects) o.setVisible(false);
      this.setGoal(this.goalRemaining); // the counter comes back for other missions
      return;
    }
    const target = hpBarFraction(b.hp, b.maxHp);
    const stageChanged = !st.visible || b.stage !== st.stage;
    if (stageChanged || b.armorKey !== st.armorKey) {
      const hex = STAR_COLORS.find(c => c.key === b.armorKey)?.hex ?? 0xffffff;
      this.bossArmor.setFillStyle(hex, 1);
      this.bossStageText.setText(`${b.stage}/${b.stages}단계`);
      this.bossArmor.setX(GAME_WIDTH - M - BOSS_BAR_W);
    }
    if (!st.visible) { // first show: no tween from empty
      this.bossFrac.v = target;
      this.bossFill.setSize(BOSS_BAR_W * target, 20);
    }
    Object.assign(st, { visible: true, stage: b.stage, hp: b.hp, maxHp: b.maxHp, armorKey: b.armorKey });
    for (const o of this.bossObjects) o.setVisible(true);
    this.setGoal(this.goalRemaining); // hides the counter while the gauge is up
    this.tweens.killTweensOf(this.bossFrac);
    this.tweens.add({
      targets: this.bossFrac, v: target, duration: BOSS_GAUGE_TWEEN_MS,
      onUpdate: () => this.bossFill.setSize(Math.max(0, BOSS_BAR_W * this.bossFrac.v), 20),
    });
  }

  setGoal(remaining) {
    this.goalRemaining = remaining;
    const show = remaining !== null && remaining !== undefined && !this.bossState?.visible;
    this.goalLabel.setVisible(show);
    this.goalValue.setVisible(show).setText(show ? String(remaining) : '');
  }

  createStripFeedback() {
    this.strip = initialStrip();
    this.stripShown = { text: null, tone: null };
    this.stripFlash = this.add.rectangle(0, PANEL_H, GAME_WIDTH, HUD_INSTRUCTION_H).setOrigin(0).setStrokeStyle(4, 0xffffff, 1).setFillStyle(0, 0).setVisible(false);
    this.stripLadder = this.add.graphics();
    this.cellBlink = this.add.graphics().setVisible(false); // wrong-shot highlight on a gauge cell (blinks; the white charge border stays)
    this.cellBlinkTween = this.tweens.add({ targets: this.cellBlink, alpha: 0.35, duration: 220, yoyo: true, repeat: -1, paused: true });
    this.ladderKey = null;
  }

  /** The single place the strip state changes; redraws only when the shown text/tone changed. */
  stripEvent(event) {
    const next = stripReducer(this.strip, event);
    if (next === this.strip) return false;
    this.strip = next;
    const { text, tone } = stripText(next);
    if (text !== this.stripShown.text || tone !== this.stripShown.tone) {
      this.stripShown.text = text;
      this.stripShown.tone = tone;
      this.renderStrip(text, tone);
    }
    if (!next.message) this.clearLadder();
    return true;
  }

  renderStrip(text, tone) {
    const t = this.instruction;
    const style = STRIP_TONES[tone];
    t.setColor(style ? style.text : '#ffffff');
    t.setFontSize(STRIP_FONT);
    t.setText(text);
    if (t.height > HUD_INSTRUCTION_H - 16) t.setFontSize(STRIP_FONT_SMALL); // once; a long text may still wrap to 3 lines
  }

  clearLadder() {
    if (this.ladderKey === null) return;
    this.ladderKey = null;
    this.stripLadder.clear();
    this.cellBlinkTween.pause();
    this.cellBlink.clear().setVisible(false);
  }

  update() {
    if (this.strip.message) this.stripEvent({ type: 'tick', nowMs: this.time.now });
  }

  showToast({ text = '', colorKey = null, ladder = null, tone = 'wrong', priority = false } = {}) {
    if (!this.stripEvent({ type: 'message', text, tone, priority, nowMs: this.time.now })) return; // held back by a priority message
    const style = STRIP_TONES[tone] ?? STRIP_TONES.wrong;
    this.stripFlash.setStrokeStyle(4, style.stroke, 1).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.stripFlash);
    this.tweens.add({ targets: this.stripFlash, alpha: 0, duration: 600, onComplete: () => this.stripFlash.setVisible(false) });

    this.clearLadder();
    if (!colorKey) return;
    if (ladder === 'furnace') {
      this.ladderKey = colorKey;
      const x0 = GAME_WIDTH - M - (FURNACE_STAGES.length * LADDER_W + (FURNACE_STAGES.length - 1) * LADDER_GAP);
      FURNACE_STAGES.forEach((c, i) => {
        const lx = x0 + i * (LADDER_W + LADDER_GAP);
        this.stripLadder.fillStyle(c.hex, 1);
        this.stripLadder.fillRect(lx, LADDER_Y, LADDER_W, LADDER_H);
        if (c.key === colorKey) {
          this.stripLadder.lineStyle(2, 0xffffff, 1);
          this.stripLadder.strokeRect(lx - 1, LADDER_Y - 2, LADDER_W + 2, LADDER_H + 4);
        }
      });
    } else if (ladder === 'star' && this.gaugeVisible) {
      this.ladderKey = colorKey;
      const cx = this.gauge.cellCenterX(colorKey);
      this.cellBlink.clear();
      this.cellBlink.lineStyle(5, 0xff8a7a, 1); // thinner and wider than the white 7 px charge border: it never replaces it
      this.cellBlink.strokeRoundedRect(cx - CELL_W / 2 - 9, GAUGE_Y - 9, CELL_W + 18, CELL_H + 18, 14);
      this.cellBlink.setVisible(true).setAlpha(1);
      this.cellBlinkTween.restart();
    }
  }

  // ---- star-gauge correct range ("맞힐 별") ---------------------------------------

  createGaugeTarget() {
    this.targetBox = this.add.graphics().setVisible(false);
    this.targetLabel = this.add
      .text(0, GAUGE_Y - 12, '맞힐 별', { ...TXT, fontSize: '24px', fontStyle: 'bold', color: '#8fd3ff' })
      .setOrigin(0.5, 1)
      .setVisible(false);
    this.targetKeys = null;
    this.targetEdges = { l: 0, r: 0 }; // tweened left/right edge (px) of the bracket
  }

  /** Left/right pixel edge of the cell range `keys` (null when empty). Called on events only. */
  targetEdgesOf(keys) {
    if (!keys?.length) return null;
    let l = Infinity;
    let r = -Infinity;
    for (const k of keys) {
      const cx = this.gauge.cellCenterX(k);
      l = Math.min(l, cx - CELL_W / 2);
      r = Math.max(r, cx + CELL_W / 2);
    }
    return { l, r };
  }

  drawTarget() {
    const { l, r } = this.targetEdges;
    this.targetBox.clear();
    this.targetBox.lineStyle(5, TARGET_COLOR, 1);
    this.targetBox.strokeRoundedRect(l - 8, GAUGE_Y - 8, r - l + 16, CELL_H + 16, 12);
    this.targetLabel.setX((l + r) / 2);
  }

  syncTargetVisible() {
    const on = !!this.targetKeys && this.gaugeVisible;
    this.targetBox.setVisible(on);
    this.targetLabel.setVisible(on);
  }

  setGaugeTarget(t) {
    this.tweens.killTweensOf(this.targetEdges);
    const to = this.targetEdgesOf(t?.keys);
    this.targetKeys = to ? t.keys : null;
    this.syncTargetVisible();
    if (!to) return;
    const from = this.targetEdgesOf(t.animateFrom);
    if (from && (from.l !== to.l || from.r !== to.r)) {
      this.targetEdges.l = from.l;
      this.targetEdges.r = from.r;
      this.drawTarget();
      this.tweens.add({
        targets: this.targetEdges, l: to.l, r: to.r, duration: TARGET_TWEEN_MS, ease: 'Sine.easeInOut',
        onUpdate: () => this.drawTarget(),
      });
      return;
    }
    this.targetEdges.l = to.l;
    this.targetEdges.r = to.r;
    this.drawTarget();
  }

  // ---- centre banner -----------------------------------------------------------------

  createBanner() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.bannerPanel = this.add.rectangle(cx, cy, BANNER_W, 300, 0x05070f, 0.86).setStrokeStyle(4, 0x8fd3ff, 1);
    this.bannerTitle = this.add
      .text(cx, cy, '', {
        ...TXT, fontSize: `${BANNER_TITLE_PX}px`, fontStyle: 'bold', color: '#ffffff', align: 'center',
        wordWrap: { width: BANNER_W - 2 * BANNER_PAD, useAdvancedWrap: true }, lineSpacing: 8,
      })
      .setOrigin(0.5, 0);
    this.bannerSegs = [];
    for (let i = 0; i < BANNER_BODY_SEGS; i++) {
      this.bannerSegs.push(this.add.text(cx, cy, '', { ...TXT, fontSize: `${BANNER_BODY_PX}px`, color: '#e8ecff' }).setOrigin(0, 0.5));
    }
    this.bannerBox = this.add.container(0, 0, [this.bannerPanel, this.bannerTitle, ...this.bannerSegs]).setDepth(50).setVisible(false);
  }

  setBanner(b) {
    this.tweens.killTweensOf(this.bannerBox);
    if (!b?.visible) {
      this.bannerBox.setVisible(false);
      return;
    }
    const cx = GAME_WIDTH / 2;
    this.bannerTitle.setText(b.title ?? '');
    const lines = b.body ? b.body.split('\n') : [];
    const titleH = this.bannerTitle.height;
    const h = BANNER_PAD * 2 + titleH + (lines.length ? 20 + lines.length * BANNER_BODY_LINE_H : 0);
    const top = GAME_HEIGHT / 2 - h / 2;
    this.bannerPanel.setSize(BANNER_W, h).setPosition(cx, GAME_HEIGHT / 2);
    this.bannerTitle.setPosition(cx, top + BANNER_PAD);
    let seg = 0;
    lines.forEach((line, li) => {
      const y = top + BANNER_PAD + titleH + 20 + li * BANNER_BODY_LINE_H + BANNER_BODY_LINE_H / 2;
      const parts = splitEmphasis(line, b.emphasis);
      const used = [];
      let w = 0;
      for (const part of parts) {
        const t = this.bannerSegs[seg++];
        if (!t) break;
        t.setText(part.text).setColor(part.emph ? BANNER_ACCENT : '#e8ecff').setFontStyle(part.emph ? 'bold' : 'normal').setVisible(true);
        used.push(t);
        w += t.width;
      }
      let x = cx - w / 2;
      for (const t of used) {
        t.setPosition(x, y);
        x += t.width;
      }
    });
    for (; seg < BANNER_BODY_SEGS; seg++) this.bannerSegs[seg].setVisible(false);
    this.bannerBox.setAlpha(0).setVisible(true);
    this.tweens.add({ targets: this.bannerBox, alpha: 1, duration: 180 });
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
      .setOrigin(0.5);
    this.resumeButton = armButton(resume, () => this.closePause(true));
    this.pauseOverlay = this.add.container(0, 0, [dim, title, resume]).setDepth(100).setVisible(false);
  }

  /** A mission scene is running and in play (not a card, picture, quiz or restart flash). */
  isGameplayLive() {
    const key = this.activeKey;
    if (this.paused || !key || !this.scene.isActive(key)) return false;
    return this.scene.get(key)?.playing === true;
  }

  openPause() {
    if (this.paused || !this.activeKey || !this.scene.isActive(this.activeKey)) return;
    this.paused = true;
    this.scene.pause(this.activeKey);
    this.resumeButton.rearm(); // the tap that opened it (or the return from background) can't close it
    this.pauseOverlay.setVisible(true);
  }

  closePause(resume) {
    if (!this.paused) return;
    this.paused = false;
    this.pauseOverlay.setVisible(false);
    if (resume && this.activeKey) this.scene.resume(this.activeKey);
  }
}
