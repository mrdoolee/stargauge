// Dev-time only image generation. NOT part of the game bundle.
//   node --env-file=.env tools/gen-images.mjs <assetId> [--ref <png>] [--dry-run]
// Env: OPENAI_API_KEY (never logged), OPENAI_IMAGE_MODEL.
// Assumptions (verify against current OpenAI docs before first real run):
//  - POST https://api.openai.com/v1/images/generations takes JSON {model, prompt, size, background, n}.
//  - With --ref, POST https://api.openai.com/v1/images/edits takes multipart/form-data with
//    model, prompt, size, background, n and the reference as `image[]` (gpt-image family).
//  - The response is JSON with data[0].b64_json (gpt-image models always return base64).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GENERATIONS_URL = 'https://api.openai.com/v1/images/generations';
export const EDITS_URL = 'https://api.openai.com/v1/images/edits';

/**
 * Pure: build the request description for one manifest asset. No I/O, no network.
 * Returns { url, kind: 'json'|'multipart', fields } where fields is a plain object (no key, no file bytes).
 */
export function buildRequest(asset, { model, ref = null } = {}) {
  if (!asset) throw new Error('asset is required');
  if (!model) throw new Error('OPENAI_IMAGE_MODEL is not set');
  const t = asset.technical || {};
  const fields = { model, prompt: asset.prompt, size: t.request_size || '1024x1024', n: 1 };
  if (t.alpha) fields.background = 'transparent';
  return ref
    ? { url: EDITS_URL, kind: 'multipart', fields, ref }
    : { url: GENERATIONS_URL, kind: 'json', fields };
}

/** Pure: printable form of a request with the key redacted. */
export function describeRequest(req, apiKey) {
  const headers = { Authorization: `Bearer ${apiKey ? '[REDACTED]' : '(missing)'}` };
  if (req.kind === 'json') headers['Content-Type'] = 'application/json';
  return { method: 'POST', url: req.url, headers, [req.kind === 'json' ? 'body' : 'form']: { ...req.fields, ...(req.ref ? { 'image[]': req.ref } : {}) } };
}

export function parseArgs(argv) {
  const out = { assetId: null, ref: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ref') out.ref = argv[++i];
    else if (a === '--dry-run') out.dryRun = true;
    else if (!a.startsWith('--') && !out.assetId) out.assetId = a;
    else throw new Error(`unknown argument: ${a}`);
  }
  return out;
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const args = parseArgs(process.argv.slice(2));
  if (!args.assetId) throw new Error('usage: node --env-file=.env tools/gen-images.mjs <assetId> [--ref <png>] [--dry-run]');
  const manifest = JSON.parse(readFileSync(resolve(root, 'art/asset-manifest.json'), 'utf8'));
  const asset = manifest.assets.find(a => a.id === args.assetId);
  if (!asset) throw new Error(`unknown asset id "${args.assetId}". Known: ${manifest.assets.map(a => a.id).join(', ')}`);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set (run with: node --env-file=.env tools/gen-images.mjs ...)');
  if (!model) throw new Error('OPENAI_IMAGE_MODEL is not set (add it to .env)');
  const req = buildRequest(asset, { model, ref: args.ref });
  if (args.dryRun) {
    console.log(JSON.stringify(describeRequest(req, apiKey), null, 2));
    return;
  }

  let res;
  if (req.kind === 'json') {
    res = await fetch(req.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(req.fields),
    });
  } else {
    const form = new FormData();
    for (const [k, v] of Object.entries(req.fields)) form.append(k, String(v));
    form.append('image[]', new Blob([readFileSync(resolve(req.ref))], { type: 'image/png' }), 'ref.png');
    res = await fetch(req.url, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  }
  if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('response had no data[0].b64_json');
  const outPath = resolve(root, 'art/raw', `${asset.id}.png`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(b64, 'base64'));
  console.log(`wrote ${outPath} (model ${model}). Record it in art/PROVENANCE.md.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => {
    console.error(`error: ${e.message}`);
    process.exit(1);
  });
}
