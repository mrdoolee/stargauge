// 최종 결과 화면. Nothing is saved or sent anywhere; "처음부터 다시" clears the run and returns to the title.
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { createGaugeView, FONT } from '../objects/gaugeView.js';
import { STAR_COLORS } from '../logic/temperature.js';
import { buildResultSummary, clearRunKeys } from '../logic/flow.js';
import { armButton } from '../ui/button.js';
import { getDifficulty } from '../logic/difficulty.js';
import { bgm } from '../audio/bgm.js';

const cx = GAME_WIDTH / 2;

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('result');
  }

  create() {
    bgm.requestForScene(this.scene.key);
    this.leaving = false;
    const sum = buildResultSummary({
      results: this.registry.get('results') ?? {},
      gaugeFinal: this.registry.get('gaugeFinal'),
      measuredCounts: this.registry.get('measuredCounts'),
    });
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05070f, 1);
    this.add.text(cx, 70, '탐사 완료! 결과', {
      fontFamily: FONT, fontSize: '50px', color: '#8fd3ff',
    }).setOrigin(0.5);

    this.add.text(cx, 118, `난이도: ${getDifficulty(this.registry.get('difficulty')).label}`, {
      fontFamily: FONT, fontSize: '30px', color: '#ffd84a',
    }).setOrigin(0.5);

    // Per-mission stars
    sum.missions.forEach((m, k) => {
      const y = 160 + k * 66;
      this.add.text(70, y, m.label, { fontFamily: FONT, fontSize: '36px', color: '#ffffff' }).setOrigin(0, 0.5);
      this.add.text(GAME_WIDTH - 70, y, '★'.repeat(m.stars) + '☆'.repeat(3 - m.stars), {
        fontFamily: FONT, fontSize: '46px', color: '#ffd84a',
      }).setOrigin(1, 0.5);
    });
    this.add.text(70, 160 + 4 * 66, '귀환 보고서', { fontFamily: FONT, fontSize: '36px', color: '#ffffff' }).setOrigin(0, 0.5);
    this.add.text(GAME_WIDTH - 70, 160 + 4 * 66, sum.quizText, {
      fontFamily: FONT, fontSize: '46px', color: '#9ff0c8',
    }).setOrigin(1, 0.5);

    // Completed star gauge (청색 -> 적색)
    const cellW = 86;
    const gap = 4;
    const width = 7 * cellW + 6 * gap;
    const x0 = (GAME_WIDTH - width) / 2;
    this.add.text(cx, 530, '완성한 스타게이지', { fontFamily: FONT, fontSize: '30px', color: '#e8ecff' }).setOrigin(0.5);
    this.add.text(x0, 570, '높다', { fontFamily: FONT, fontSize: '24px', color: '#e8ecff' }).setOrigin(0, 1);
    this.add.text(x0 + width, 570, '낮다', { fontFamily: FONT, fontSize: '24px', color: '#e8ecff' }).setOrigin(1, 1);
    const view = createGaugeView(this, { x: x0, y: 580, cellW, cellH: 50, gap, colorLabels: true, fontSize: 24 });
    view.setFilled(sum.gauge);

    // m4 measurement chart: how many stars of each color the student measured (omitted without data)
    if (sum.measuredCounts) this.drawMeasuredChart(sum.measuredCounts);

    const btn = this.add.text(cx, 1210, '처음부터 다시', {
      fontFamily: FONT, fontSize: '40px', color: '#05070f', backgroundColor: '#8fd3ff', padding: { x: 60, y: 18 },
    }).setOrigin(0.5);
    armButton(btn, () => this.restart());
  }

  /** Bar chart, STAR_COLORS order (hottest first); bar colour = the star colour. y 690..1150. */
  drawMeasuredChart(counts) {
    this.add.text(cx, 700, '내가 측정한 별의 색', { fontFamily: FONT, fontSize: '30px', color: '#e8ecff' }).setOrigin(0.5);
    const baseY = 1090;
    const maxH = 280;
    const slot = 88;
    const x0 = cx - (counts.length * slot) / 2;
    const max = Math.max(1, ...counts.map(c => c.count));
    counts.forEach((c, i) => {
      const col = STAR_COLORS.find(sc => sc.key === c.key);
      const x = x0 + i * slot + slot / 2;
      const h = c.count > 0 ? Math.max(8, (c.count / max) * maxH) : 0;
      if (h > 0) this.add.rectangle(x, baseY - h / 2, slot - 18, h, col.hex, 1).setStrokeStyle(2, 0xffffff, 0.35);
      this.add.text(x, baseY - h - 6, String(c.count), { fontFamily: FONT, fontSize: '28px', color: '#ffffff' }).setOrigin(0.5, 1);
      this.add.text(x, baseY + 10, col.label, { fontFamily: FONT, fontSize: '22px', color: '#e8ecff' }).setOrigin(0.5, 0);
    });
    this.add.rectangle(cx, baseY, counts.length * slot, 3, 0xe8ecff, 0.7);
  }

  restart() {
    if (this.leaving) return;
    this.leaving = true;
    for (const key of clearRunKeys) this.registry.remove(key); // `muted` stays
    this.scene.start('title');
  }
}
