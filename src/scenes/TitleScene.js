import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { addBackdrop } from '../config/assets.js';
import { armButton } from '../ui/button.js';
import { bgm } from '../audio/bgm.js';
import { DIFFICULTY, DIFFICULTY_KEYS, getDifficulty } from '../logic/difficulty.js';
import { FONT } from '../objects/gaugeView.js';

const MINT = 0x7ef2d4;
const INK = 0x05070f;
// Top-to-bottom shade over the art: dark for the title, clear for the ship, darker for the buttons.
const SHADE_STOPS = [[0, 0.8], [0.38, 0.2], [0.55, 0], [0.8, 0.6], [1, 0.867]];
const SHADE_KEY = 'title-shade';

const CHIP_W = 174;
const CHIP_H = 84;
const CHIP_GAP = 18;
const CHIP_Y = 972;
const START_W = 372;
const START_H = 106;
const START_Y = 1125;
// Credit line at the bottom of the title screen, below the start button (button bottom 1178).
const FOOTER_TEXT = '© 2026 Designed & Developed by 두리쌤(@trdoolee). All rights reserved.';
const FOOTER_Y = 1238;
const FOOTER_MAX_W = GAME_WIDTH - 48; // 24 px side margin; the line shrinks to fit if the font renders wider

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  /** One small canvas texture (made once) holding the vertical shade; stretched over the screen. */
  makeShade() {
    if (!this.textures.exists(SHADE_KEY)) {
      const tex = this.textures.createCanvas(SHADE_KEY, 2, 256);
      const ctx = tex.getContext();
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      for (const [at, a] of SHADE_STOPS) grad.addColorStop(at, `rgba(5,7,15,${a})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2, 256);
      tex.refresh();
    }
    return this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, SHADE_KEY).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(-9);
  }

  create() {
    bgm.requestForScene(this.scene.key);
    const cx = GAME_WIDTH / 2;
    if (addBackdrop(this, 'title-art', GAME_WIDTH, GAME_HEIGHT)) this.makeShade();

    // Letter-spaced centred text: Phaser adds the spacing after the last glyph too, so nudge by half of it.
    const spaced = (y, str, size, color, spacing) =>
      this.add
        .text(cx + spacing / 2, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, letterSpacing: spacing })
        .setOrigin(0.5);
    spaced(175, '별빛 탐사선', 30, '#bfeee2', 13.5);
    this.add
      .text(cx, 275, '스타게이지호', { fontFamily: FONT, fontSize: '88px', color: '#ffffff', letterSpacing: 3.5 })
      .setOrigin(0.5);
    this.add.rectangle(cx, 357, 64, 2, MINT, 0.8);

    // Difficulty choice (kept across "처음부터 다시" in the registry; default 중간).
    let selected = getDifficulty(this.registry.get('difficulty')).key;
    spaced(900, '난이도를 고르세요', 26, '#c9d3e6', 2.6);
    const chips = {};
    const paint = () => {
      for (const k of DIFFICULTY_KEYS) {
        const on = k === selected;
        const { bg, label } = chips[k];
        bg.clear();
        bg.fillStyle(on ? MINT : INK, on ? 1 : 0.53);
        bg.fillRoundedRect(-CHIP_W / 2, -CHIP_H / 2, CHIP_W, CHIP_H, CHIP_H / 2);
        bg.lineStyle(2, on ? MINT : 0xffffff, on ? 1 : 0.33);
        bg.strokeRoundedRect(-CHIP_W / 2, -CHIP_H / 2, CHIP_W, CHIP_H, CHIP_H / 2);
        label.setColor(on ? '#05070f' : '#e8ecff');
      }
    };
    DIFFICULTY_KEYS.forEach((k, i) => {
      const x = cx + (i - 1) * (CHIP_W + CHIP_GAP);
      const bg = this.add.graphics().setPosition(x, CHIP_Y);
      const label = this.add
        .text(x, CHIP_Y + 3, DIFFICULTY[k].label, { fontFamily: FONT, fontSize: '34px', color: '#e8ecff' })
        .setOrigin(0.5);
      const hit = this.add.zone(x, CHIP_Y, CHIP_W + CHIP_GAP, CHIP_H + 12); // touch area spans the gap (no overlap) and is >= the old 190x90
      chips[k] = { bg, label };
      armButton(hit, () => { selected = k; this.registry.set('difficulty', k); paint(); });
    });
    this.registry.set('difficulty', selected);
    paint();

    const startBg = this.add.graphics().setPosition(cx, START_Y);
    startBg.fillStyle(0xffffff, 1);
    startBg.fillRoundedRect(-START_W / 2, -START_H / 2, START_W, START_H, 50);
    spaced(START_Y + 3, '시작', 42, '#05070f', 12.6);
    const btn = this.add.zone(cx, START_Y, START_W, START_H);
    let leaving = false;
    armButton(btn, () => {
      if (leaving) return;
      leaving = true;
      this.scene.start(this.scene.get('briefing') ? 'briefing' : 'm1', { mission: 'm1' });
    });

    const footer = this.add
      .text(cx, FOOTER_Y, FOOTER_TEXT, { fontFamily: FONT, fontSize: '18px', color: '#8a96ad' })
      .setOrigin(0.5);
    if (footer.width > FOOTER_MAX_W) footer.setScale(FOOTER_MAX_W / footer.width);
  }
}
