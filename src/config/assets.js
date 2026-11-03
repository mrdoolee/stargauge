// Generated art in public/img/. Stars stay code-drawn forever (color accuracy). IMAGE_ASSETS lists ONLY files that
// actually exist in public/img/, so nothing 404s. To adopt another image: put the PNG in public/img/ and add
// { key, path: 'img/<file>.png' } here. Opaque backgrounds/title/briefing art are JPEG (q85) to keep the boot download small. Loaded keys: ship (256x304, scaled to the 64x76 footprint),
// asteroid-1..3, star-shape, furnace-shape (grayscale, tinted by code), bg-space-far, bg-space-near, bg-furnace,
// bg-cluster, title-art, glass-craft, briefing-m1..m4. Scenes read them by key (some are wired in later tasks).
// Code-baked textures (starTextures.js) skip baking when a loaded texture already has the same key.
export const IMAGE_ASSETS = [
  { key: 'ship', path: 'img/ship.png' },
  { key: 'asteroid-1', path: 'img/asteroid-1.png' },
  { key: 'asteroid-2', path: 'img/asteroid-2.png' },
  { key: 'asteroid-3', path: 'img/asteroid-3.png' },
  { key: 'star-shape', path: 'img/star-shape.png' },
  { key: 'furnace-shape', path: 'img/furnace-shape.png' },
  { key: 'bg-space-far', path: 'img/bg-space-far.jpg' },
  { key: 'bg-space-near', path: 'img/bg-space-near.png' },
  { key: 'bg-furnace', path: 'img/bg-furnace.jpg' },
  { key: 'bg-cluster', path: 'img/bg-cluster.jpg' },
  { key: 'title-art', path: 'img/title-art.jpg' },
  { key: 'glass-craft', path: 'img/glass-craft.png' },
  { key: 'briefing-m1', path: 'img/briefing-m1.jpg' },
  { key: 'briefing-m2', path: 'img/briefing-m2.jpg' },
  { key: 'briefing-m3', path: 'img/briefing-m3.jpg' },
  { key: 'briefing-m4', path: 'img/briefing-m4.jpg' },
];

// JSON-hash atlases (scene.load.atlas). List ONLY atlases whose png+json exist in public/img/ (paths relative to public/).
// `captain`: frames normal/smile/serious/surprised (416x520 each, transparent). `ship-engine` (sprite-gen, tag burn)
// is NOT listed: pending the Codex reset on 2026-11-20 (see art/PROVENANCE.md); Task 12 draws the flicker in code.
export const ATLAS_ASSETS = [
  { key: 'captain', png: 'img/captain.png', json: 'img/captain.json' },
];

// Captain expression frame tags in `captain` (Task 12 picks one per mission).
export const BRIEFING_EXPRESSIONS = ['normal', 'smile', 'serious', 'surprised'];

export function loadImages(scene, list = IMAGE_ASSETS, atlases = ATLAS_ASSETS) {
  for (const { key, path } of list) scene.load.image(key, path);
  for (const { key, png, json } of atlases) scene.load.atlas(key, png, json);
}

/** True when an optional image with this key was loaded. */
export function hasImage(scene, key) {
  return !!key && scene.textures.exists(key);
}

/** `key` if that image is loaded, else `fallbackKey`. */
export function pickKey(scene, key, fallbackKey) {
  return hasImage(scene, key) ? key : fallbackKey;
}

/** Add a full-screen backdrop image if loaded (plain dark otherwise: no dot stars that look like targets). */
export function addBackdrop(scene, key, width, height, depth = -10) {
  if (!hasImage(scene, key)) return null;
  return scene.add.image(width / 2, height / 2, key).setDisplaySize(width, height).setDepth(depth);
}
