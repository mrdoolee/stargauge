// Mission 5 — 귀환 보고서. Three quiz questions, one at a time. Tap a choice -> immediate correct/incorrect
// + explanation, then "다음". Saves registry results.quiz = gradeQuiz(answers) and goes to 'result'.
import { bgm } from '../audio/bgm.js';
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import { QUIZ, gradeQuiz } from '../data/quiz.js';
import { FONT } from '../objects/gaugeView.js';
import { reportLayout, REPORT_L } from '../logic/reportLayout.js';
import { hasImage } from '../config/assets.js';
import { drawGlassCraft } from '../objects/glassCraft.js';
import { armButton } from '../ui/button.js';

const Q2_LAYOUT = reportLayout(QUIZ.find(q => q.id === 'q2').choices.length, true);

/**
 * Q2 picture slot. `y` is the TOP of the image area (center = y + h/2), the same box drawImageSlot draws.
 * Task 11: set `key` to the loaded image key and the box is drawn as that image instead.
 */
export const Q2_IMAGE_SLOT = {
  qid: 'q2', x: GAME_WIDTH / 2, y: Q2_LAYOUT.image.top, w: 560, h: Q2_LAYOUT.image.h, key: 'glass-craft', label: '유리 공예 그림',
};
/**
 * Label anchors for (가) 노란빛 / (나) 붉은빛, in screen coords INSIDE the image area: the centers of its
 * left and right halves, vertically at the image center.
 */
export function q2LabelAnchors(slot = Q2_IMAGE_SLOT) {
  const cy = slot.y + slot.h / 2;
  return {
    left: { x: slot.x - slot.w / 4, y: cy }, // (가) 노란빛
    right: { x: slot.x + slot.w / 4, y: cy }, // (나) 붉은빛
  };
}

const D = 10;

export default class ReportScene extends Phaser.Scene {
  constructor() {
    super('report');
  }

  create() {
    bgm.requestForScene(this.scene.key);
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
    const r = this.addUi(this.add.rectangle(x, y, w, h, fill, 1).setStrokeStyle(3, 0xffffff, 0.4));
    this.addUi(this.add.text(x, y, label, {
      fontFamily: FONT, fontSize: `${fontSize}px`, fontStyle: 'bold', color: '#ffffff', align: 'center',
      wordWrap: { width: w - 40, useAdvancedWrap: true },
    }).setOrigin(0.5), D + 1);
    armButton(r, () => onTap(r)); // a press that started on it, >= 300 ms after it appeared
    return r;
  }

  drawImageSlot(slot) {
    const { x, y, w, h } = slot;
    const anchors = q2LabelAnchors(slot);
    if (hasImage(this, slot.key)) {
      this.addUi(this.add.image(x, y + h / 2, slot.key).setDisplaySize(w, h));
      const style = { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: '#ffffff', stroke: '#101424', strokeThickness: 7 };
      this.addUi(this.add.text(anchors.left.x, anchors.left.y, '(가)', style).setOrigin(0.5), D + 1);
      this.addUi(this.add.text(anchors.right.x, anchors.right.y, '(나)', style).setOrigin(0.5), D + 1);
      return;
    }
    drawGlassCraft(this, slot, anchors, FONT).forEach(o => this.addUi(o, D + 1));
  }

  ask(i) {
    const q = QUIZ[i];
    this.clearUi();
    const L = reportLayout(q.choices.length, q.id === Q2_IMAGE_SLOT.qid);
    const cx = GAME_WIDTH / 2;
    this.addUi(this.add.text(cx, REPORT_L.headerY, `귀환 보고서  ${i + 1} / ${QUIZ.length}`, {
      fontFamily: FONT, fontSize: '32px', color: '#8fd3ff',
    }).setOrigin(0.5));
    this.addUi(this.add.text(cx, L.prompt.top, q.prompt, {
      fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#ffffff', align: 'center', lineSpacing: 10,
      wordWrap: { width: GAME_WIDTH - 40, useAdvancedWrap: true },
    }).setOrigin(0.5, 0));

    const hasImage = q.id === Q2_IMAGE_SLOT.qid;
    if (hasImage) this.drawImageSlot(Q2_IMAGE_SLOT);

    // Shown in shuffled order; each choice keeps its original index (answerIndex refers to it).
    const order = Phaser.Utils.Array.Shuffle(q.choices.map((_, k) => k));
    const feedback = this.addUi(this.add.text(cx, L.feedback.top, '', {
      fontFamily: FONT, fontSize: '30px', color: '#ffffff', align: 'center', lineSpacing: 8,
      wordWrap: { width: GAME_WIDTH - 100, useAdvancedWrap: true },
    }).setOrigin(0.5, 0));

    let answered = false; // one answer per question: later taps are ignored
    order.forEach((idx, pos) => {
      this.button(cx, L.choices[pos].top + L.choices[pos].h / 2, 600, L.choices[pos].h, q.choices[idx], 0x2b3a5c, 32, r => {
        if (answered) return;
        answered = true;
        const ok = idx === q.answerIndex;
        this.answers[i] = idx;
        r.setFillStyle(ok ? 0x1f8a5b : 0xb04545);
        feedback.setText(`${ok ? '정답이에요!' : '아쉬워요.'} ${q.explanation}`).setColor(ok ? '#9ff0c8' : '#ffb4a8');
        const last = i + 1 >= QUIZ.length;
        let advanced = false;
        this.button(cx, L.next.top + L.next.h / 2, 320, L.next.h, last ? '결과 보기' : '다음', 0x3c6fa8, 36, () => {
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
