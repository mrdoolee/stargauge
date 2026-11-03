// ?debug=1&colors=1 only (see main.js; not even imported otherwise). Shows the 7 star textures and 4 furnace textures
// on a dark field, each with its palette swatch beside it and the texture's center pixel read back as hex.
// OK = the center pixel equals the palette hex exactly.
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { STAR_COLORS, FURNACE_STAGES } from '../logic/temperature.js';
import { makeStarTextures, STAR_TEX } from '../objects/starTextures.js';

const hex6 = n => '#' + n.toString(16).padStart(6, '0');

export default class DebugColorsScene extends Phaser.Scene {
  constructor() {
    super('debugcolors');
  }

  create() {
    makeStarTextures(this);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05070f, 1);
    const label = { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff' };
    this.add.text(20, 16, 'star colors (texture | palette swatch)', label);
    const row = (items, prefix, y0) => items.forEach((c, i) => {
      const y = y0 + i * 112;
      this.add.image(90, y, `${prefix}-${c.key}`);
      this.add.rectangle(210, y, 64, 64, c.hex).setStrokeStyle(2, 0x555555);
      const px = this.textures.getPixel(STAR_TEX / 2, STAR_TEX / 2, `${prefix}-${c.key}`);
      const got = Phaser.Display.Color.GetColor(px.red, px.green, px.blue);
      const ok = prefix === 'furnace' ? 'shaded' : got === c.hex ? 'OK' : 'MISMATCH';
      this.add.text(270, y - 24, `${prefix}-${c.key}\npalette ${hex6(c.hex)}\ncenter  ${hex6(got)}  ${ok}`, label);
    });
    row(STAR_COLORS, 'star', 90);
    this.add.text(20, 90 + 7 * 112 - 40, 'furnace stages (white must still read white)', label);
    row(FURNACE_STAGES, 'furnace', 90 + 7 * 112 + 30);
  }
}
