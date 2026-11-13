import { describe, it, expect } from 'vitest';
import { ENDING } from '../../src/data/copy.js';
import { IMAGE_ASSETS } from '../../src/config/assets.js';

describe('ending screen copy', () => {
  it('the captain thanks the crew for guarding the galaxy and sends them back to class', () => {
    expect(ENDING.line).toContain('은하를 지켜');
    expect(ENDING.line).toContain('대원');
    expect(ENDING.line).toContain('선생님과 함께');
  });
  it('the speech bubble holds at most 4 lines of at most 12 characters (30 px font in a 416 px bubble)', () => {
    const lines = ENDING.line.split('\n');
    expect(lines.length).toBeLessThanOrEqual(4);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(12);
  });
  it('has a title, a label and a button', () => {
    for (const k of ['label', 'title', 'button']) expect(ENDING[k]).toBeTruthy();
  });
  it('the ending art is loaded at boot', () => {
    expect(IMAGE_ASSETS.some(a => a.key === 'ending-art' && a.path === 'img/ending-art.jpg')).toBe(true);
  });
});
