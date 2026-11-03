import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ATLAS_ASSETS, BRIEFING_EXPRESSIONS } from '../../src/config/assets.js';

const pub = p => resolve(process.cwd(), 'public', p);

describe('assets config', () => {
  it('briefing expressions are exactly the four captain tags', () => {
    expect(BRIEFING_EXPRESSIONS).toEqual(['normal', 'smile', 'serious', 'surprised']);
  });
  it('every atlas entry has its png and json on disk', () => {
    for (const { key, png, json } of ATLAS_ASSETS) {
      expect(existsSync(pub(png)), `${key} png`).toBe(true);
      expect(existsSync(pub(json)), `${key} json`).toBe(true);
    }
  });
});
