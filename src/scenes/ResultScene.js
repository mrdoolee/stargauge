// 최종 결과 화면. Nothing is saved or sent anywhere; "처음부터 다시" clears the run and returns to the title.
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { createGaugeView, FONT } from '../objects/gaugeView.js';
import { drawOrionFigure } from '../objects/orionFigure.js';
import { buildResultSummary, clearRunKeys } from '../logic/flow.js';

const cx = GAME_WIDTH / 2;

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('result');
  }

  create() {
    this.leaving = false;
    const sum = buildResultSummary({
      results: this.registry.get('results') ?? {},
      orionTagged: this.registry.get('orionTagged') ?? [],
      gaugeFinal: this.registry.get('gaugeFinal'),
    });
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05070f, 1);
    this.add.text(cx, 70, '탐사 완료! 결과', {
      fontFamily: FONT, fontSize: '50px', fontStyle: 'bold', color: '#8fd3ff',
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
      fontFamily: FONT, fontSize: '46px', fontStyle: 'bold', color: '#9ff0c8',
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

    // Orion thumbnail (real colors, tagged stars ringed)
    this.add.text(cx, 710, '내가 찾은 오리온자리', { fontFamily: FONT, fontSize: '30px', color: '#e8ecff' }).setOrigin(0.5);
    drawOrionFigure(this, {
      box: { x: 190, y: 750, w: 340, h: 380 }, depth: 5, tagged: sum.orionTagged, k: 0.6, lineWidth: 3,
    });

    const btn = this.add.text(cx, 1210, '처음부터 다시', {
      fontFamily: FONT, fontSize: '40px', color: '#05070f', backgroundColor: '#8fd3ff', padding: { x: 60, y: 18 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => this.restart());
  }

  restart() {
    if (this.leaving) return;
    this.leaving = true;
    for (const key of clearRunKeys) this.registry.remove(key); // `muted` stays
    this.scene.start('title');
  }
}
