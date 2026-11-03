// Optional generated art. Stars stay code-drawn forever (color accuracy); everything else may be swapped
// for a PNG later. IMAGE_ASSETS lists ONLY files that actually exist in public/img/, so nothing 404s.
// To adopt an image: put the PNG in public/img/, add { key, path: 'img/<file>.png' } here. Keys the game looks for:
//   ship (64x76 look, any size is scaled), asteroid, fire-button,
//   bg-space, bg-furnace, title-art, glass-craft.
// Code-baked textures (starTextures.js) skip baking when a loaded texture already has the same key.
export const IMAGE_ASSETS = [
  { key: 'ship', path: 'img/ship.png' },
  { key: 'asteroid-1', path: 'img/asteroid-1.png' },
  { key: 'asteroid-2', path: 'img/asteroid-2.png' },
  { key: 'asteroid-3', path: 'img/asteroid-3.png' },
  { key: 'star-shape', path: 'img/star-shape.png' },
  { key: 'furnace-shape', path: 'img/furnace-shape.png' },
  { key: 'bg-space-far', path: 'img/bg-space-far.png' },
  { key: 'bg-space-near', path: 'img/bg-space-near.png' },
  { key: 'bg-furnace', path: 'img/bg-furnace.png' },
  { key: 'bg-cluster', path: 'img/bg-cluster.png' },
  { key: 'title-art', path: 'img/title-art.png' },
  { key: 'glass-craft', path: 'img/glass-craft.png' },
  { key: 'briefing-m1', path: 'img/briefing-m1.png' },
  { key: 'briefing-m2', path: 'img/briefing-m2.png' },
  { key: 'briefing-m3', path: 'img/briefing-m3.png' },
  { key: 'briefing-m4', path: 'img/briefing-m4.png' },
];

export function loadImages(scene, list = IMAGE_ASSETS) {
  for (const { key, path } of list) scene.load.image(key, path);
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
