import { describe, it, expect } from 'vitest';
import { GAME_WIDTH, GAME_HEIGHT } from '../src/main.js';

describe('game config', () => {
  it('uses 720x1280 portrait logical size', () => {
    expect(GAME_WIDTH).toBe(720);
    expect(GAME_HEIGHT).toBe(1280);
  });
});

import { shouldSleep } from '../src/config/orientation.js';

describe('orientation', () => {
  it('sleeps only in landscape on a touch device', () => {
    expect(shouldSleep(true)).toBe(true);
    expect(shouldSleep(false)).toBe(false);
  });
});
