import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IMAGE_ASSETS, ATLAS_ASSETS, BRIEFING_EXPRESSIONS } from '../../src/config/assets.js';

const pub = p => resolve(process.cwd(), 'public', p);

describe('assets config', () => {
  it('briefing expressions are exactly the four captain tags', () => {
    expect(BRIEFING_EXPRESSIONS).toEqual(['normal', 'smile', 'serious', 'surprised']);
  });
  it('every image entry has its file on disk', () => {
    for (const { key, path } of IMAGE_ASSETS) expect(existsSync(pub(path)), `${key} ${path}`).toBe(true);
  });
  it('every atlas entry has its png and json on disk', () => {
    for (const { key, png, json } of ATLAS_ASSETS) {
      expect(existsSync(pub(png)), `${key} png`).toBe(true);
      expect(existsSync(pub(json)), `${key} json`).toBe(true);
    }
  });
  it('captain atlas (JSON hash) has exactly the four expression frames', () => {
    const entry = ATLAS_ASSETS.find(a => a.key === 'captain');
    expect(entry).toBeTruthy();
    const json = JSON.parse(readFileSync(pub(entry.json), 'utf8'));
    expect(Object.keys(json.frames).sort()).toEqual([...BRIEFING_EXPRESSIONS].sort());
  });
});
