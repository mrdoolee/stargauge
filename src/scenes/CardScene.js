// Summary card between missions (key 'card').
//
//   this.scene.start('card', {
//     title: '정리',                     // optional
//     body: MISSION_TEXT.m1.card,        // text shown in the middle
//     gauge: ['blue', ...],              // optional: draw the 7-cell gauge with these keys filled
//     next: 'm2', nextData: {...},       // scene started by the '다음' button
//     buttonLabel: '다음',               // optional
//   });

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { createGaugeView, FONT } from '../objects/gaugeView.js';

export default class CardScene extends Phaser.Scene {
  constructor() {
    super('card');
  }

  init(data) {
    this.cardData = data ?? {};
    this.leaving = false;
  }

  create() {
    const d = this.cardData;
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH - 48, GAME_HEIGHT * 0.7, 0x111a30, 0.95)
      .setStrokeStyle(4, 0x8fd3ff);

    this.add
      .text(cx, 300, d.title ?? '정리 카드', { fontFamily: FONT, fontSize: '48px', fontStyle: 'bold', color: '#8fd3ff' })
      .setOrigin(0.5);

    let bodyY = 460;
    if (Array.isArray(d.gauge)) {
      const cellW = 86;
      const gap = 4;
      const width = 7 * cellW + 6 * gap;
      const x0 = (GAME_WIDTH - width) / 2;
      const gy = 430;
      this.add.text(x0, gy - 12, '높다', { fontFamily: FONT, fontSize: '28px', color: '#e8ecff' }).setOrigin(0, 1);
      this.add.text(x0 + width, gy - 12, '낮다', { fontFamily: FONT, fontSize: '28px', color: '#e8ecff' }).setOrigin(1, 1);
      const view = createGaugeView(this, { x: x0, y: gy, cellW, cellH: 56, gap, colorLabels: true, fontSize: 26 });
      view.setFilled(d.gauge);
      this.add
        .text(cx, gy + 56 + 56, '표면 온도', { fontFamily: FONT, fontSize: '28px', color: '#e8ecff' })
        .setOrigin(0.5, 0);
      bodyY = gy + 200;
    }

    this.add
      .text(cx, bodyY, d.body ?? '', {
        fontFamily: FONT,
        fontSize: '36px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10,
        wordWrap: { width: GAME_WIDTH - 140, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0);

    const btn = this.add
      .text(cx, GAME_HEIGHT * 0.78, d.buttonLabel ?? '다음', {
        fontFamily: FONT,
        fontSize: '44px',
        color: '#05070f',
        backgroundColor: '#8fd3ff',
        padding: { x: 80, y: 22 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => this.goNext());
  }

  goNext() {
    if (this.leaving) return;
    this.leaving = true;
    const { next, nextData } = this.cardData;
    if (next) this.scene.start(next, nextData);
  }
}
