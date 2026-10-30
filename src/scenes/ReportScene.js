// Mission 5 — 귀환 보고서. Three quiz questions, one at a time. Tap a choice -> immediate correct/incorrect
// + explanation, then "다음". Saves registry results.quiz = gradeQuiz(answers) and goes to 'result'.
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { QUIZ, gradeQuiz } from '../data/quiz.js';
import { FONT } from '../objects/gaugeView.js';

/**
 * Q2 picture slot. Task 11 replaces the gray box: set `key` to the loaded image key and the box is drawn
 * as that image instead. (가) 노란빛 / (나) 붉은빛 labels go at q2LabelAnchors() (screen coords).
 */
export const Q2_IMAGE_SLOT = {
  qid: 'q2', x: GAME_WIDTH / 2, y: 410, w: 560, h: 240, key: null, label: '유리 공예 그림',
};
export function q2LabelAnchors(slot = Q2_IMAGE_SLOT) {
  return {
    left: { x: slot.x - slot.w * 0.25, y: slot.y + slot.h / 2 + 24 }, // (가) 노란빛
    right: { x: slot.x + slot.w * 0.25, y: slot.y + slot.h / 2 + 24 }, // (나) 붉은빛
  };
}

const D = 10;
const BTN_H = 96;

export default class ReportScene extends Phaser.Scene {
  constructor() {
    super('report');
  }

  create() {
    this.answers = [];
    this.ui = [];
    this.leaving = false;
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05070f, 1);
    this.ask(0);
  }

  clearUi() {
    this.ui.forEach(o => o.destroy());
    this.ui = [];
  }

  addUi(o, depth = D) {
    this.ui.push(o.setDepth(depth));
    return o;
  }

  button(x, y, w, h, label, fill, fontSize, onTap) {
    const r = this.addUi(this.add.rectangle(x, y, w, h, fill, 1).setStrokeStyle(3, 0xffffff, 0.4)
      .setInteractive({ useHandCursor: true }));
    this.addUi(this.add.text(x, y, label, {
      fontFamily: FONT, fontSize: `${fontSize}px`, fontStyle: 'bold', color: '#ffffff', align: 'center',
      wordWrap: { width: w - 40, useAdvancedWrap: true },
    }).setOrigin(0.5), D + 1);
    r.on('pointerup', () => onTap(r));
    return r;
  }

  drawImageSlot(slot) {
    const { x, y, w, h } = slot;
    if (slot.key && this.textures.exists(slot.key)) {
      this.addUi(this.add.image(x, y + h / 2, slot.key).setDisplaySize(w, h));
      return;
    }
    this.addUi(this.add.rectangle(x, y + h / 2, w, h, 0x4a4f5c, 1).setStrokeStyle(3, 0x8890a8));
    this.addUi(this.add.text(x, y + h / 2, slot.label, {
      fontFamily: FONT, fontSize: '34px', color: '#e8ecff',
    }).setOrigin(0.5), D + 1);
  }

  ask(i) {
    const q = QUIZ[i];
    this.clearUi();
    const cx = GAME_WIDTH / 2;
    this.addUi(this.add.text(cx, 70, `귀환 보고서  ${i + 1} / ${QUIZ.length}`, {
      fontFamily: FONT, fontSize: '32px', color: '#8fd3ff',
    }).setOrigin(0.5));
    this.addUi(this.add.text(cx, 130, q.prompt, {
      fontFamily: FONT, fontSize: '38px', fontStyle: 'bold', color: '#ffffff', align: 'center', lineSpacing: 10,
      wordWrap: { width: GAME_WIDTH - 100, useAdvancedWrap: true },
    }).setOrigin(0.5, 0));

    const hasImage = q.id === Q2_IMAGE_SLOT.qid;
    if (hasImage) this.drawImageSlot(Q2_IMAGE_SLOT);
    const firstY = hasImage ? 720 : 440;
    const step = hasImage ? 112 : 130;

    // Shown in shuffled order; each choice keeps its original index (answerIndex refers to it).
    const order = Phaser.Utils.Array.Shuffle(q.choices.map((_, k) => k));
    const lastY = firstY + (order.length - 1) * step;
    const feedback = this.addUi(this.add.text(cx, lastY + BTN_H / 2 + 24, '', {
      fontFamily: FONT, fontSize: '30px', color: '#ffffff', align: 'center', lineSpacing: 8,
      wordWrap: { width: GAME_WIDTH - 100, useAdvancedWrap: true },
    }).setOrigin(0.5, 0));

    let answered = false; // one answer per question: later taps are ignored
    order.forEach((idx, pos) => {
      this.button(cx, firstY + pos * step, 600, BTN_H, q.choices[idx], 0x2b3a5c, 32, r => {
        if (answered) return;
        answered = true;
        const ok = idx === q.answerIndex;
        this.answers[i] = idx;
        r.setFillStyle(ok ? 0x1f8a5b : 0xb04545);
        feedback.setText(`${ok ? '정답이에요!' : '아쉬워요.'} ${q.explanation}`).setColor(ok ? '#9ff0c8' : '#ffb4a8');
        const last = i + 1 >= QUIZ.length;
        let advanced = false;
        this.button(cx, 1215, 320, 80, last ? '결과 보기' : '다음', 0x3c6fa8, 36, () => {
          if (advanced || this.leaving) return;
          advanced = true;
          if (last) this.finish();
          else this.ask(i + 1);
        });
      });
    });
  }

  finish() {
    if (this.leaving) return;
    this.leaving = true;
    const results = { ...(this.registry.get('results') ?? {}), quiz: gradeQuiz(this.answers) };
    this.registry.set('results', results);
    this.scene.start('result');
  }
}
