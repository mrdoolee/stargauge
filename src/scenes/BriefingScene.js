// Captain briefing before each mission (key 'briefing'): this.scene.start('briefing', { mission: 'm1'|'m2'|'m3'|'m4' }).
// Layout (spec 5.1, "가"): label + title / captain (left) + speech bubble (right) / picture / 3 bullets / goal / 출발!.
// A heat restart (scene.restart inside a mission) never comes back here.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { HUD_SAFE_MARGIN } from '../config/balance.js';
import { hasImage } from '../config/assets.js';
import { BRIEFING, briefingParts } from '../data/briefing.js';
import { createGaugeView, FONT } from '../objects/gaugeView.js';
import { STAR_COLORS } from '../logic/temperature.js';
import { armButton } from '../ui/button.js';

const M = HUD_SAFE_MARGIN;
const CAPTAIN_W = 200; // 416x520 frame -> 200x250
const CAPTAIN_H = Math.round(CAPTAIN_W * 520 / 416);
const PIC_W = 400; // 560x320 picture -> 400x229
const PIC_H = Math.round(PIC_W * 320 / 560);

export default class BriefingScene extends Phaser.Scene {
  constructor() {
    super('briefing');
  }

  init(data) {
    this.mission = BRIEFING[data?.mission] ? data.mission : 'm1';
    this.leaving = false;
  }

  create() {
    const b = BRIEFING[this.mission];
    const cx = GAME_WIDTH / 2;
    const hasCaptain = hasImage(this, 'captain') && this.textures.get('captain').has(b.expression);
    const parts = briefingParts({ mission: this.mission, hasCaptain, hasImage: k => hasImage(this, k) });

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH - 2 * M, GAME_HEIGHT - 2 * M, 0x111a30, 0.95).setStrokeStyle(4, 0x8fd3ff).setDepth(-5);

    this.add.text(cx, 52, `MISSION ${this.mission.slice(1)} 브리핑`, { fontFamily: FONT, fontSize: '28px', color: '#8fd3ff' }).setOrigin(0.5);
    this.add.text(cx, 100, b.title, { fontFamily: FONT, fontSize: '48px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);

    // captain (left) + speech bubble (right)
    const top = 150;
    const left = M + 16;
    if (parts.portrait === 'atlas') {
      this.add.image(left + CAPTAIN_W / 2, top + CAPTAIN_H / 2, 'captain', b.expression).setDisplaySize(CAPTAIN_W, CAPTAIN_H);
    } else {
      this.drawSilhouette(left + CAPTAIN_W / 2, top + CAPTAIN_H);
    }
    const bx = left + CAPTAIN_W + 24;
    const bw = GAME_WIDTH - M - 16 - bx;
    const bh = 210;
    const by = top + 20;
    this.add.rectangle(bx + bw / 2, by + bh / 2, bw, bh, 0xf2f6ff, 1).setStrokeStyle(4, 0x8fd3ff);
    this.add.triangle(bx - 6, by + 100, 0, 0, 24, -18, 24, 18, 0xf2f6ff).setOrigin(1, 0.5).setPosition(bx + 4, by + 100);
    this.add.text(bx + bw / 2, by + bh / 2, b.line, {
      fontFamily: FONT, fontSize: '32px', fontStyle: 'bold', color: '#0b1226', align: 'center',
      lineSpacing: 8, wordWrap: { width: bw - 36, useAdvancedWrap: true },
    }).setOrigin(0.5);

    // picture
    const picTop = top + CAPTAIN_H + 20;
    const picBottom = picTop + PIC_H;
    if (parts.picture === 'gauge') {
      const cellW = 78;
      const gap = 4;
      const width = 7 * cellW + 6 * gap;
      const x0 = (GAME_WIDTH - width) / 2;
      const gy = picTop + 34;
      this.add.text(x0, gy - 6, '높다', { fontFamily: FONT, fontSize: '26px', color: '#e8ecff' }).setOrigin(0, 1);
      this.add.text(x0 + width, gy - 6, '낮다', { fontFamily: FONT, fontSize: '26px', color: '#e8ecff' }).setOrigin(1, 1);
      createGaugeView(this, { x: x0, y: gy, cellW, cellH: 60, gap, colorLabels: true, fontSize: 24 })
        .setFilled(STAR_COLORS.map(c => c.key));
      this.add.text(cx, gy + 60 + 56, '표면 온도', { fontFamily: FONT, fontSize: '26px', color: '#e8ecff' }).setOrigin(0.5, 0);
    } else if (parts.picture === 'image') {
      this.add.image(cx, picTop + PIC_H / 2, b.image).setDisplaySize(PIC_W, PIC_H);
      this.add.rectangle(cx, picTop + PIC_H / 2, PIC_W, PIC_H).setStrokeStyle(3, 0x3a5a86);
    } else {
      this.add.rectangle(cx, picTop + PIC_H / 2, PIC_W, PIC_H, 0x0a1022, 1).setStrokeStyle(3, 0x3a5a86);
    }

    // bullets
    const bulletTop = picBottom + 28;
    const text = b.bullets.map(t => `• ${t}`).join('\n');
    const bullets = this.add.text(M + 28, bulletTop, text, {
      fontFamily: FONT, fontSize: '30px', color: '#e8ecff', lineSpacing: 12,
      wordWrap: { width: GAME_WIDTH - 2 * (M + 28), useAdvancedWrap: true },
    }).setOrigin(0, 0);

    // goal box (yellow border)
    const goalTop = bullets.y + bullets.height + 28;
    const goal = this.add.text(cx, 0, `임무: ${b.goal}`, {
      fontFamily: FONT, fontSize: '32px', fontStyle: 'bold', color: '#ffe27a', align: 'center', lineSpacing: 8,
      wordWrap: { width: GAME_WIDTH - 2 * (M + 28) - 40, useAdvancedWrap: true },
    }).setOrigin(0.5, 0.5);
    const gh = goal.height + 36;
    goal.setY(goalTop + gh / 2);
    this.add.rectangle(cx, goalTop + gh / 2, GAME_WIDTH - 2 * (M + 28), gh, 0x2a2410, 0.8).setStrokeStyle(4, 0xffd84a).setDepth(-1);

    const btn = this.add.text(cx, GAME_HEIGHT - M - 70, '출발!', {
      fontFamily: FONT, fontSize: '48px', color: '#05070f', backgroundColor: '#8fd3ff', padding: { x: 90, y: 20 },
    }).setOrigin(0.5);
    armButton(btn, () => this.go());
  }

  /** Code-drawn head and shoulders (navy suit, silver helmet ring) used when the captain art is missing. */
  drawSilhouette(x, bottom) {
    const g = this.add.graphics();
    g.fillStyle(0x1c2a52, 1);
    g.fillRoundedRect(x - 90, bottom - 90, 180, 90, { tl: 60, tr: 60, bl: 0, br: 0 });
    g.fillStyle(0x2a3c70, 1);
    g.fillCircle(x, bottom - 140, 62);
    g.lineStyle(8, 0xc9d3e6, 1);
    g.strokeCircle(x, bottom - 140, 62);
    g.fillStyle(0x0b1226, 1);
    g.fillRoundedRect(x - 40, bottom - 160, 80, 40, 14);
    g.lineStyle(4, 0xc9d3e6, 1);
    g.lineBetween(x - 60, bottom - 90, x + 60, bottom - 90);
  }

  go() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start(this.mission);
  }
}
