// Pure pixel helpers for baking star / furnace textures from the white-and-gray generated shapes.
// The color comes ONLY from the palette hex (STAR_COLORS / FURNACE_STAGES): a pure-white pixel becomes exactly that color.

/** rgba (RGBA bytes) with R,G,B multiplied by hex's channel / 255. Alpha kept. Returns a new array. */
export function tintPixels(rgba, hex) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    out[i] = Math.round((rgba[i] * r) / 255);
    out[i + 1] = Math.round((rgba[i + 1] * g) / 255);
    out[i + 2] = Math.round((rgba[i + 2] * b) / 255);
    out[i + 3] = rgba[i + 3];
  }
  return out;
}

/**
 * Brighten a gray shape so the given luminance percentile (0..1, among pixels with alpha > 8) maps to 255
 * (brighter pixels clamp). Keeps alpha. Returns a new array; an all-black shape is returned as a copy.
 */
export function stretchLuminance(rgba, percentile = 0.9) {
  const lum = [];
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] > 8) lum.push((rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3);
  }
  const out = new Uint8ClampedArray(rgba);
  if (!lum.length) return out;
  lum.sort((a, b) => a - b);
  const ref = lum[Math.min(lum.length - 1, Math.floor(percentile * lum.length))];
  if (ref <= 0) return out;
  const k = 255 / ref;
  for (let i = 0; i < rgba.length; i += 4) {
    out[i] = rgba[i] * k;
    out[i + 1] = rgba[i + 1] * k;
    out[i + 2] = rgba[i + 2] * k;
  }
  return out;
}

/** Pixels whose R,G,B are all >= threshold become pure white (the generated star core is ~253, the palette math needs 255). New array. */
export function snapWhite(rgba, threshold = 250) {
  const out = new Uint8ClampedArray(rgba);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i] >= threshold && out[i + 1] >= threshold && out[i + 2] >= threshold) {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
    }
  }
  return out;
}
