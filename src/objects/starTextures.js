// Code-drawn textures (fixed palette, so a star's color can never drift).
//
// Keys:
//   star-<colorKey>     core disc + thin soft rim, for the 7 STAR_COLORS
//   furnace-<key>       molten blob for the 4 FURNACE_STAGES
//   glow-<colorKey>     separate soft halo (drawn behind a star/furnace sprite, additive)
//   shield-<colorKey>   round shield ring (drones); shield-boss-<colorKey> hull-fitted ellipse (the loaded boss art)
//   ship, beam, asteroid, fx-ring, px (1x1 white)
//
// Size is the sprite's `scale`; brightness is the HALO's alpha/scale. The core is
// always drawn at full alpha so dimming never darkens (and so shifts) a star's color.

import { STAR_COLORS, FURNACE_STAGES } from '../logic/temperature.js';
import { tintPixels, stretchLuminance, snapWhite } from './tint.js';
import { BOSS_ART, BOSS_WIDTH_PX, BOSS_SHIELD_MARGIN_PX, BOSS_SHIELD_LINE_PX } from '../config/balance.js';

export const STAR_TEX = 128; // texture edge (px)
export const STAR_CORE_R = 36; // core disc radius in texture px == Arcade body radius
export const GLOW_TEX = 192;
export const ENEMY_TEX = 80; // drone / boss texture edge (px); body radius ENEMY_BODY_R at this size
export const SHIELD_TEX = 128; // shield ring edge (px)
export const SHIELD_RING_R = 56; // ring radius in texture px
export const SHIELD_RING_W = 8; // ring thickness in texture px
const BULLET_COLOR = 0xff5fd2; // pink: not one of the 7 star colors

const SHIP_COLOR = 0x7ef2d4; // mint: not one of the 7 star colors
const SHIP_TRIM = 0xd9e2ea; // silver
const BEAM_COLOR = 0x9ffff0;

function drawCore(g, hex) {
  const c = STAR_TEX / 2;
  g.fillStyle(hex, 0.18);
  g.fillCircle(c, c, STAR_CORE_R + 10);
  g.fillStyle(hex, 0.35);
  g.fillCircle(c, c, STAR_CORE_R + 5);
  g.fillStyle(hex, 1);
  g.fillCircle(c, c, STAR_CORE_R);
}

function drawGlow(g, hex) {
  const c = GLOW_TEX / 2;
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const r = c - (i * (c - STAR_CORE_R * 0.8)) / steps;
    g.fillStyle(hex, 0.055);
    g.fillCircle(c, c, r);
  }
}

function drawFurnace(g, hex) {
  const c = STAR_TEX / 2;
  const R = STAR_CORE_R;
  g.fillStyle(hex, 0.25);
  g.fillCircle(c, c, R + 8);
  g.fillStyle(hex, 1);
  // a lumpy molten drop: overlapping discs inside the body radius
  g.fillCircle(c, c + 4, R - 4);
  g.fillCircle(c - 12, c - 6, R - 14);
  g.fillCircle(c + 12, c - 8, R - 16);
  g.fillCircle(c, c - 18, R - 20);
}

// Generated shapes (public/img, white/gray only): the code multiplies in the palette color, so a pure-white
// pixel (the star core) ends up exactly STAR_COLORS[i].hex.
const STAR_CORE_WHITE = 250; // core pixels this white (art is ~253) snap to 255 so the core equals the palette color exactly
const FURNACE_SHAPE_FILL = 0.8; // the art spans ~110 px; scaled so it matches the old code blob (~88 px, hitbox R 36)
const FURNACE_LUM_PERCENTILE = 0.9; // brighten the gray blob so 'white' still reads white

function shapePixels(scene, shapeKey, fill = 1, stretch = null) {
  const tex = scene.textures;
  if (!tex.exists(shapeKey)) return null;
  const src = tex.get(shapeKey).getSourceImage();
  const cv = document.createElement('canvas');
  cv.width = STAR_TEX;
  cv.height = STAR_TEX;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const w = src.width * fill;
  const h = src.height * fill;
  ctx.drawImage(src, (STAR_TEX - w) / 2, (STAR_TEX - h) / 2, w, h);
  const data = ctx.getImageData(0, 0, STAR_TEX, STAR_TEX).data;
  return stretch ? stretchLuminance(data, stretch) : snapWhite(data, STAR_CORE_WHITE);
}

function bakeTinted(scene, key, pixels, hex) {
  const tex = scene.textures;
  if (tex.exists(key)) return; // once per game
  const ct = tex.createCanvas(key, STAR_TEX, STAR_TEX);
  const img = new ImageData(tintPixels(pixels, hex), STAR_TEX, STAR_TEX);
  ct.context.putImageData(img, 0, 0);
  ct.refresh();
}

/** Texture key of the shield ring for a STAR_COLORS key. */
export const shieldTextureKey = colorKey => `shield-${colorKey}`;

/** White ring, RGBA bytes (size x size): rgb 255 everywhere, soft 1.5 px edge in alpha. Tint it with tintPixels. */
export function ringPixels(size = SHIELD_TEX, radius = SHIELD_RING_R, width = SHIELD_RING_W) {
  const out = new Uint8ClampedArray(size * size * 4);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.abs(Math.hypot(x - c, y - c) - radius);
      const a = Math.max(0, Math.min(1, (width / 2 - d) / 1.5 + 0.5));
      const i = (y * size + x) * 4;
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = Math.round(a * 255);
    }
  }
  return out;
}

function bakeShield(scene, key, hex) {
  const tex = scene.textures;
  if (tex.exists(key)) return; // once per game
  const ct = tex.createCanvas(key, SHIELD_TEX, SHIELD_TEX);
  ct.context.putImageData(new ImageData(tintPixels(ringPixels(), hex), SHIELD_TEX, SHIELD_TEX), 0, 0);
  ct.refresh();
}

/** Texture key of the hull-fitted boss shield ellipse for a STAR_COLORS key. */
export const bossShieldTextureKey = colorKey => `shield-boss-${colorKey}`;

/**
 * White ellipse ring, RGBA bytes (w x h), centred: rgb 255 everywhere, soft 1.5 px edge in alpha (as ringPixels).
 * Distance to the ellipse = (q - 1) / |grad q| with q = hypot(dx/rx, dy/ry), so the line keeps `width` all round.
 */
export function ellipseRingPixels(w, h, rx, ry, width) {
  const out = new Uint8ClampedArray(w * h * 4);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ux = (x - cx) / rx;
      const uy = (y - cy) / ry;
      const q = Math.hypot(ux, uy);
      const grad = q > 0 ? Math.hypot(ux / rx, uy / ry) / q : 0;
      const d = grad > 0 ? Math.abs(q - 1) / grad : Infinity;
      const a = Math.max(0, Math.min(1, (width / 2 - d) / 1.5 + 0.5));
      const i = (y * w + x) * 4;
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = Math.round(a * 255);
    }
  }
  return out;
}

/** Boss shield ellipse in screen px: the loaded hull (BOSS_ART.hull at BOSS_WIDTH_PX) + BOSS_SHIELD_MARGIN_PX each side. */
export function bossShieldGeometry() {
  const k = BOSS_WIDTH_PX / BOSS_ART.canvasW;
  const rx = (BOSS_ART.hull.w * k) / 2 + BOSS_SHIELD_MARGIN_PX;
  const ry = (BOSS_ART.hull.h * k) / 2 + BOSS_SHIELD_MARGIN_PX;
  const lineW = BOSS_SHIELD_LINE_PX;
  const pad = lineW / 2 + 2; // soft edge room
  return { rx, ry, lineW, w: 2 * Math.ceil(rx + pad), h: 2 * Math.ceil(ry + pad) };
}

function bakeBossShield(scene, key, hex, g) {
  const tex = scene.textures;
  if (tex.exists(key)) return; // once per game
  const ct = tex.createCanvas(key, g.w, g.h);
  ct.context.putImageData(new ImageData(tintPixels(ellipseRingPixels(g.w, g.h, g.rx, g.ry, g.lineW), hex), g.w, g.h), 0, 0);
  ct.refresh();
}

export function makeStarTextures(scene) {
  const tex = scene.textures;
  const starPx = shapePixels(scene, 'star-shape');
  const furnacePx = shapePixels(scene, 'furnace-shape', FURNACE_SHAPE_FILL, FURNACE_LUM_PERCENTILE);
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const bake = (key, w, h, draw) => {
    if (tex.exists(key)) return;
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };

  for (const c of STAR_COLORS) {
    if (starPx) bakeTinted(scene, `star-${c.key}`, starPx, c.hex);
    else bake(`star-${c.key}`, STAR_TEX, STAR_TEX, () => drawCore(g, c.hex));
    bake(`glow-${c.key}`, GLOW_TEX, GLOW_TEX, () => drawGlow(g, c.hex));
  }
  for (const c of STAR_COLORS) bakeShield(scene, shieldTextureKey(c.key), c.hex);
  const bossShield = bossShieldGeometry();
  for (const c of STAR_COLORS) bakeBossShield(scene, bossShieldTextureKey(c.key), c.hex, bossShield);
  for (const s of FURNACE_STAGES) {
    if (furnacePx) bakeTinted(scene, `furnace-${s.key}`, furnacePx, s.hex);
    else bake(`furnace-${s.key}`, STAR_TEX, STAR_TEX, () => drawFurnace(g, s.hex));
  }

  bake('ship', 64, 76, () => {
    // rounded mint/silver ship, nose up (nothing here uses a star hex)
    g.fillStyle(BEAM_COLOR, 0.85); // engine flame
    g.fillRoundedRect(24, 62, 16, 14, 6);
    g.fillStyle(0xffffff, 0.9);
    g.fillRoundedRect(28, 62, 8, 9, 4);
    g.fillStyle(SHIP_TRIM, 1); // silver wings
    g.fillTriangle(2, 62, 24, 30, 30, 60);
    g.fillTriangle(62, 62, 40, 30, 34, 60);
    g.fillStyle(0x3fbfa6, 1); // teal wing tips
    g.fillTriangle(2, 62, 8, 50, 14, 62);
    g.fillTriangle(62, 62, 56, 50, 50, 62);
    g.fillStyle(SHIP_TRIM, 1); // silver hull outline
    g.fillEllipse(32, 34, 36, 66);
    g.fillStyle(SHIP_COLOR, 1); // mint hull
    g.fillEllipse(32, 35, 28, 58);
    g.fillStyle(0x1b2a3a, 1); // cockpit
    g.fillEllipse(32, 30, 16, 20);
    g.fillStyle(0xc8fff0, 0.9);
    g.fillEllipse(29, 25, 5, 8);
  });
  bake('beam', 12, 32, () => {
    g.fillStyle(BEAM_COLOR, 0.45);
    g.fillRect(0, 0, 12, 32);
    g.fillStyle(0xffffff, 1);
    g.fillRect(3, 0, 6, 32);
  });
  bake('asteroid', 72, 72, () => {
    g.fillStyle(0x6b6f7a, 1);
    g.fillPoints(
      [
        { x: 36, y: 2 }, { x: 60, y: 12 }, { x: 70, y: 38 }, { x: 56, y: 64 },
        { x: 30, y: 70 }, { x: 8, y: 56 }, { x: 2, y: 30 }, { x: 14, y: 10 },
      ],
      true,
    );
    g.fillStyle(0x4c505a, 1);
    g.fillCircle(26, 28, 8);
    g.fillCircle(46, 48, 6);
  });
  bake('drone', ENEMY_TEX, ENEMY_TEX, () => {
    // angular drone: dark steel arrowhead body with swept wings and a red eye (no round star-like silhouette)
    g.fillStyle(0x59627a, 1);
    g.fillTriangle(40, 76, 4, 22, 20, 12); // left wing
    g.fillTriangle(40, 76, 76, 22, 60, 12); // right wing
    g.fillStyle(0x8a94ad, 1);
    g.fillTriangle(40, 78, 22, 20, 58, 20); // hull
    g.fillStyle(0x3a4156, 1);
    g.fillRect(34, 8, 12, 14); // top fin
    g.fillStyle(0xff3b3b, 1);
    g.fillRect(35, 34, 10, 6); // eye
  });
  bake('boss', ENEMY_TEX, ENEMY_TEX, () => {
    // boss ship: broad armored hull, twin cannons
    g.fillStyle(0x4a5068, 1);
    g.fillPoints([{ x: 40, y: 78 }, { x: 4, y: 40 }, { x: 10, y: 14 }, { x: 70, y: 14 }, { x: 76, y: 40 }], true);
    g.fillStyle(0x7a849e, 1);
    g.fillPoints([{ x: 40, y: 70 }, { x: 16, y: 38 }, { x: 22, y: 20 }, { x: 58, y: 20 }, { x: 64, y: 38 }], true);
    g.fillStyle(0x2c3144, 1);
    g.fillRect(14, 2, 8, 20);
    g.fillRect(58, 2, 8, 20);
    g.fillStyle(0xff3b3b, 1);
    g.fillRect(28, 34, 24, 8); // visor
  });
  bake('bullet', 24, 24, () => {
    g.fillStyle(BULLET_COLOR, 1);
    g.fillPoints([{ x: 12, y: 1 }, { x: 22, y: 12 }, { x: 12, y: 23 }, { x: 2, y: 12 }], true);
    g.fillStyle(0xffffff, 0.9);
    g.fillPoints([{ x: 12, y: 7 }, { x: 17, y: 12 }, { x: 12, y: 17 }, { x: 7, y: 12 }], true);
  });
  bake('fx-ring', 128, 128, () => {
    g.lineStyle(6, 0xffffff, 1);
    g.strokeCircle(64, 64, 58);
  });
  bake('px', 4, 4, () => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
  });

  g.destroy();
}

export const ASTEROID_KEYS = ['asteroid-1', 'asteroid-2', 'asteroid-3'];
export const ASTEROID_TEX = 72; // the code asteroid's edge; loaded art (128 px) is scaled to this footprint

/** Loaded generated asteroid texture keys (empty -> the code-drawn 'asteroid'). */
export function loadedAsteroidKeys(scene) {
  return ASTEROID_KEYS.filter(k => scene.textures.exists(k));
}

/** Texture key for a pooled object's look. */
export function textureFor(kind, colorKey) {
  if (kind === 'furnace') return `furnace-${colorKey}`;
  if (kind === 'asteroid') return 'asteroid';
  return `star-${colorKey}`;
}
