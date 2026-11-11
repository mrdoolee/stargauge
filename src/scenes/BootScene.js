import Phaser from 'phaser';
import { loadImages } from '../config/assets.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { FONT } from '../objects/gaugeView.js';

const BAR_W = 520;
const BAR_H = 28;

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    // Loading feedback: a Korean line + progress bar, so a slow classroom network does not look broken.
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const label = this.add.text(cx, cy - 50, '불러오는 중… 0%', {
      fontFamily: FONT, fontSize: '40px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.rectangle(cx, cy + 10, BAR_W + 8, BAR_H + 8, 0x1b2540, 1).setStrokeStyle(3, 0x6f86b3, 0.9);
    const fill = this.add.rectangle(cx - BAR_W / 2, cy + 10, 0, BAR_H, 0x8fd3ff, 1).setOrigin(0, 0.5);
    this.load.on('progress', v => {
      fill.width = BAR_W * v;
      label.setText(`불러오는 중… ${Math.round(v * 100)}%`);
    });
    loadImages(this); // only images listed in config/assets.js (those that exist), so nothing 404s
  }

  create() {
    if (this.registry.get('debugFps')) this.scene.launch('debugfps'); // ?debug=1 only
    this.scene.start(this.registry.get('debugStart') ?? 'title'); // debugStart only set by ?debug=1&mission=
  }
}
