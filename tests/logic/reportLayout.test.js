import { describe, it, expect } from 'vitest';
import { reportLayout } from '../../src/logic/reportLayout.js';
import { QUIZ } from '../../src/data/quiz.js';

describe('reportLayout', () => {
  QUIZ.forEach(q => {
    it(`${q.id}: blocks are in order, never overlap, and fit the 1280 screen`, () => {
      const L = reportLayout(q.choices.length, q.id === 'q2');
      const blocks = [L.prompt, ...(L.image ? [L.image] : []), ...L.choices, L.feedback, L.next];
      for (let i = 1; i < blocks.length; i++) {
        expect(blocks[i].top).toBeGreaterThanOrEqual(blocks[i - 1].top + blocks[i - 1].h);
      }
      const end = L.next.top + L.next.h;
      expect(end).toBeLessThanOrEqual(1280);
    });
  });
  it('only q2 has an image', () => {
    expect(reportLayout(3, true).image).not.toBeNull();
    expect(reportLayout(2, false).image).toBeNull();
  });
});
