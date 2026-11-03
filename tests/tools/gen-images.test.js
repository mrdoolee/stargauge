import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildRequest, describeRequest, parseArgs, redactSecrets, GENERATIONS_URL, EDITS_URL } from '../../tools/gen-images.mjs';

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
    expect(buildRequest(find('bg-space-far'), { model: 'm' }).fields.background).toBeUndefined();
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
  it('every asset has request_size, alpha and target_size', () => {
    for (const a of manifest.assets) {
      expect(a.technical.request_size, a.id).toMatch(/^\d+x\d+$/);
      expect(typeof a.technical.alpha, a.id).toBe('boolean');
      expect(a.technical.target_size, a.id).toMatch(/^\d+x\d+$/);
    }
  });
  it('star-shape and furnace-shape prompts demand grayscale/white only', () => {
    for (const id of ['star-shape', 'furnace-shape']) {
      const p = find(id).prompt;
      expect(p, id).toMatch(/grayscale|white only/i);
      expect(p, id).not.toMatch(/\b(?:blue|red|orange|yellow)\s+(?:glow|core|color|tint|main)/i);
    }
  });
  it('background prompts forbid point stars', () => {
    const bgs = manifest.assets.filter(a => a.id.startsWith('bg-'));
    expect(bgs.length).toBeGreaterThanOrEqual(4);
    for (const a of bgs) expect(a.prompt, a.id).toMatch(/no stars|no star points/i);
  });
  it('new Part 2 assets exist and bg-space was renamed', () => {
    for (const id of ['captain-base', 'star-shape', 'furnace-shape', 'bg-space-far', 'bg-space-near', 'bg-cluster', 'briefing-m1', 'briefing-m2', 'briefing-m3', 'briefing-m4']) expect(find(id), id).toBeTruthy();
    expect(find('bg-space')).toBeUndefined();
  });
  it('parseArgs', () => {
    expect(parseArgs(['ship', '--ref', 'a.png', '--dry-run'])).toEqual({ assetId: 'ship', ref: 'a.png', dryRun: true });
  });
});

describe('redactSecrets (error bodies printed to the console)', () => {
  it('removes the exact API key, even if it does not look like sk-...', () => {
    const out = redactSecrets('bad key: abc123XYZ-key used', 'abc123XYZ-key');
    expect(out).not.toContain('abc123XYZ-key');
    expect(out).toContain('[REDACTED]');
  });
  it('removes anything shaped like an OpenAI key', () => {
    const body = '{"error":{"message":"Incorrect API key provided: sk-proj-AbC_12-xyz. See ...","code":"invalid_api_key"}} also sk-live_99';
    const out = redactSecrets(body, undefined);
    expect(out).not.toMatch(/sk-[A-Za-z0-9_-]+/);
    expect(out).toContain('invalid_api_key');
  });
  it('handles every occurrence, regex characters in the key, and empty input', () => {
    expect(redactSecrets('k.+k and k.+k', 'k.+k')).toBe('[REDACTED] and [REDACTED]');
    expect(redactSecrets('', 'x')).toBe('');
    expect(redactSecrets(undefined, 'x')).toBe('');
    expect(redactSecrets('nothing secret', '')).toBe('nothing secret');
  });
});
