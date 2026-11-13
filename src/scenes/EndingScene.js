// Ending screen (key 'ending'), after the result screen: generated art (ship heading home past a calm galaxy), "임무 완료!",
// the captain (smile frame) thanking the crew in a speech bubble, and "처음으로", which clears the run and returns to the title.
// Layout on 720x1280: the art keeps its upper ~30% and lower ~40% dark, so the title sits on the sky and the captain, bubble
// and button sit below the galaxy.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { addBackdrop, hasImage } from '../config/assets.js';
import { ENDING } from '../data/copy.js';
import { clearRunKeys } from '../logic/flow.js';
import { FONT } from '../objects/gaugeView.js';
import { armButton } from '../ui/button.js';
import { bgm } from '../audio/bgm.js';

const MINT = 0x7ef2d4;
const CAPTAIN_W = 200; // 416x520 frame -> 200x250 (same size as the briefing)
const CAPTAIN_H = Math.round(CAPTAIN_W * 520 / 416);
const SIDE = 40;
const TOP = 830; // captain and bubble row (below the galaxy)
const BUTTON_Y = 1170;

export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('ending');
  }

  create() {
    bgm.requestForScene(this.scene.key);
    this.leaving = false;
    const cx = GAME_WIDTH / 2;
    if (!addBackdrop(this, 'ending-art', GAME_WIDTH, GAME_HEIGHT)) {
      this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05070f, 1).setDepth(-10);
    }

    this.add
      .text(cx + 4, 120, ENDING.label, { fontFamily: FONT, fontSize: '26px', color: '#bfeee2', letterSpacing: 8 })
      .setOrigin(0.5);
    this.add.text(cx, 190, ENDING.title, { fontFamily: FONT, fontSize: '72px', color: '#ffffff' }).setOrigin(0.5);
    this.add.rectangle(cx, 250, 64, 2, MINT, 0.8);

    // captain (left) + speech bubble (right); without the captain art the bubble spans the row
    const hasCaptain = hasImage(this, 'captain') && this.textures.get('captain').has('smile');
    if (hasCaptain) {
      this.add.image(SIDE + CAPTAIN_W / 2, TOP + CAPTAIN_H / 2, 'captain', 'smile').setDisplaySize(CAPTAIN_W, CAPTAIN_H);
    }
    const bx = hasCaptain ? SIDE + CAPTAIN_W + 24 : SIDE;
    const bw = GAME_WIDTH - SIDE - bx;
    const bh = 236;
    const by = TOP + 6;
    this.add.rectangle(bx + bw / 2, by + bh / 2, bw, bh, 0xf2f6ff, 0.96).setStrokeStyle(4, MINT);
    if (hasCaptain) this.add.triangle(bx + 4, by + 110, 0, 0, 24, -18, 24, 18, 0xf2f6ff).setOrigin(1, 0.5);
    this.add.text(bx + bw / 2, by + bh / 2, ENDING.line, {
      fontFamily: FONT, fontSize: '30px', color: '#0b1226', align: 'center', lineSpacing: 10,
    }).setOrigin(0.5);

    const btnBg = this.add.graphics().setPosition(cx, BUTTON_Y);
    btnBg.fillStyle(0xffffff, 1);
    btnBg.fillRoundedRect(-186, -53, 372, 106, 50);
    this.add.text(cx, BUTTON_Y + 3, ENDING.button, { fontFamily: FONT, fontSize: '40px', color: '#05070f' }).setOrigin(0.5);
    armButton(this.add.zone(cx, BUTTON_Y, 372, 106), () => this.restart());
  }

  restart() {
    if (this.leaving) return;
    this.leaving = true;
    for (const key of clearRunKeys) this.registry.remove(key); // `muted` stays
    this.scene.start('title');
  }
}
