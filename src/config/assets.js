// Optional generated art. Stars stay code-drawn forever (color accuracy); everything else may be swapped
// for a PNG later. IMAGE_ASSETS lists ONLY files that actually exist in public/img/, so nothing 404s.
// To adopt an image: put the PNG in public/img/, add { key, path: 'img/<file>.png' } here. Keys the game looks for:
//   ship (64x76 look, any size is scaled), asteroid, fire-button,
//   bg-space, bg-furnace, title-art, glass-craft.
// Code-baked textures (starTextures.js) skip baking when a loaded texture already has the same key.
export const IMAGE_ASSETS = [
  // { key: 'ship', path: 'img/ship.png' },
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
