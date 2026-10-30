import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { addBackdrop } from '../config/assets.js';
import { armButton } from '../ui/button.js';
import { DIFFICULTY, DIFFICULTY_KEYS, getDifficulty } from '../logic/difficulty.js';

const FONT = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    const cx = GAME_WIDTH / 2;
    addBackdrop(this, 'title-art', GAME_WIDTH, GAME_HEIGHT); // no-op until the image exists
    this.add
      .text(cx, GAME_HEIGHT * 0.3, '별빛 탐사선\n스타게이지호', {
        fontFamily: FONT,
        fontSize: '64px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    // Difficulty choice (kept across "처음부터 다시" in the registry; default 중간).
    let selected = getDifficulty(this.registry.get('difficulty')).key;
    this.add
      .text(cx, GAME_HEIGHT * 0.5, '난이도를 고르세요', { fontFamily: FONT, fontSize: '30px', color: '#e8ecff' })
      .setOrigin(0.5);
    const chips = {};
    const paint = () => {
      for (const k of DIFFICULTY_KEYS) {
        const on = k === selected;
        chips[k]
          .setColor(on ? '#05070f' : '#ffffff')
          .setBackgroundColor(on ? '#ffd84a' : '#26304f')
          .setStroke(on ? '#ffffff' : '#8fd3ff', on ? 5 : 2)
          .setText(on ? `✓ ${DIFFICULTY[k].label}` : DIFFICULTY[k].label);
      }
    };
    DIFFICULTY_KEYS.forEach((k, i) => {
      const t = this.add
        .text(cx + (i - 1) * 215, GAME_HEIGHT * 0.5 + 80, DIFFICULTY[k].label, {
          fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: '#ffffff', padding: { x: 28, y: 18 },
          fixedWidth: 190, align: 'center',
        })
        .setOrigin(0.5);
      chips[k] = t;
      armButton(t, () => { selected = k; this.registry.set('difficulty', k); paint(); });
    });
    this.registry.set('difficulty', selected);
    paint();

    const btn = this.add
      .text(cx, GAME_HEIGHT * 0.76, '시작', {
        fontFamily: FONT,
        fontSize: '48px',
        color: '#05070f',
        backgroundColor: '#8fd3ff',
        padding: { x: 80, y: 24 },
      })
      .setOrigin(0.5);
    let leaving = false;
    armButton(btn, () => {
      if (leaving) return;
      leaving = true;
      this.scene.start('m1');
    });
  }
}
