import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildRequest, describeRequest, parseArgs, GENERATIONS_URL, EDITS_URL } from '../../tools/gen-images.mjs';

const manifest = JSON.parse(readFileSync(new URL('../../art/asset-manifest.json', import.meta.url), 'utf8'));
const find = id => manifest.assets.find(a => a.id === id);

describe('gen-images buildRequest', () => {
  it('transparent asset -> generations endpoint with background transparent', () => {
    const r = buildRequest(find('ship'), { model: 'm-x' });
    expect(r.url).toBe(GENERATIONS_URL);
    expect(r.fields).toMatchObject({ model: 'm-x', size: '1024x1024', background: 'transparent', n: 1 });
    expect(r.fields.prompt).toBe(find('ship').prompt);
  });
  it('opaque asset has no background field', () => {
    expect(buildRequest(find('bg-space'), { model: 'm' }).fields.background).toBeUndefined();
  });
  it('--ref switches to the edits endpoint', () => {
    const r = buildRequest(find('asteroid-1'), { model: 'm', ref: 'art/raw/ship.png' });
    expect(r.url).toBe(EDITS_URL);
    expect(r.kind).toBe('multipart');
  });
  it('requires a model', () => {
    expect(() => buildRequest(find('ship'), {})).toThrow(/OPENAI_IMAGE_MODEL/);
  });
  it('describeRequest never contains the key', () => {
    const s = JSON.stringify(describeRequest(buildRequest(find('ship'), { model: 'm' }), 'sk-SECRET'));
    expect(s).not.toContain('sk-SECRET');
    expect(s).toContain('REDACTED');
  });
  it('manifest prompts forbid lettering and every asset has a request size', () => {
    for (const a of manifest.assets) {
      expect(a.prompt).toMatch(/NO text/);
      expect(a.technical.request_size).toMatch(/^\d+x\d+$/);
    }
  });
  it('parseArgs', () => {
    expect(parseArgs(['ship', '--ref', 'a.png', '--dry-run'])).toEqual({ assetId: 'ship', ref: 'a.png', dryRun: true });
  });
});
