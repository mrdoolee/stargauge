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

import { MISSION_TEXT } from '../../src/data/copy.js';
import { formatTime } from '../../src/logic/jewelbox.js';

describe('MISSION_TEXT.m4 HUD band', () => {
  it('instruction + timer suffix fits two lines (<= 34 chars)', () => {
    const line = `${MISSION_TEXT.m4.instruction} (남은 시간 ${formatTime(210)})`;
    expect(line.length).toBeLessThanOrEqual(34);
    expect(MISSION_TEXT.m4.instruction).toContain('청색');
    expect(MISSION_TEXT.m4.instruction).toContain('표시');
  });
});
