import { describe, it, expect } from 'vitest';
import { wrongShotMessage } from '../../src/data/copy.js';

describe('wrongShotMessage m4', () => {
  it('explains scattered blue stars and keeps the tail, no numbers', () => {
    const m = wrongShotMessage('m4', { colorKey: 'blue' });
    expect(m).toContain('청색');
    expect(m.endsWith('온도는 색으로 비교해요.')).toBe(true);
    expect(m).not.toMatch(/\d|켈빈/);
  });
});
