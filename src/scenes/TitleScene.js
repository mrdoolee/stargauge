import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';

const FONT = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, GAME_HEIGHT * 0.3, '별빛 탐사선\n스타게이지호', {
        fontFamily: FONT,
        fontSize: '64px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    const btn = this.add
      .text(cx, GAME_HEIGHT * 0.65, '시작', {
        fontFamily: FONT,
        fontSize: '48px',
        color: '#05070f',
        backgroundColor: '#8fd3ff',
        padding: { x: 80, y: 24 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    // Placeholder: does nothing yet.
    btn.on('pointerdown', () => {});
  }
}
