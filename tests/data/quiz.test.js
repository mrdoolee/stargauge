import { describe, it, expect } from 'vitest';
import { QUIZ, gradeQuiz } from '../../src/data/quiz.js';

describe('QUIZ', () => {
  it('3 items, valid answerIndex', () => {
    expect(QUIZ).toHaveLength(3);
    QUIZ.forEach(q => {
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.choices.length);
      expect(q.explanation).toBeTruthy();
    });
  });
  it('correct answers', () => {
    expect(QUIZ[0].choices[QUIZ[0].answerIndex]).toBe('높을수록');
    expect(QUIZ[1].choices[QUIZ[1].answerIndex]).toBe('(가) 노란빛 부분');
    expect(QUIZ[2].choices[QUIZ[2].answerIndex].replace(/\n/g, ' ')).toBe('베텔게우스는 적색이라 표면 온도가 낮기 때문'); // the line break is layout only
  });
  it('gradeQuiz', () => {
    const ans = QUIZ.map(q => q.answerIndex);
    expect(gradeQuiz(ans)).toEqual({ correct: 3, total: 3, perItem: [true, true, true] });
    expect(gradeQuiz([ans[0], 9, ans[2]])).toEqual({ correct: 2, total: 3, perItem: [true, false, true] });
    expect(gradeQuiz([]).correct).toBe(0);
  });
});
