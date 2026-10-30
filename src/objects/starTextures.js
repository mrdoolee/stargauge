// Code-drawn textures (fixed palette, so a star's color can never drift).
//
// Keys:
//   star-<colorKey>     core disc + thin soft rim, for the 7 STAR_COLORS
//   furnace-<key>       molten blob for the 4 FURNACE_STAGES
//   glow-<colorKey>     separate soft halo (drawn behind a star/furnace sprite, additive)
//   ship, beam, asteroid, fx-ring, px (1x1 white)
//
// Size is the sprite's `scale`; brightness is the HALO's alpha/scale. The core is
// always drawn at full alpha so dimming never darkens (and so shifts) a star's color.

import { STAR_COLORS, FURNACE_STAGES } from '../logic/temperature.js';

export const STAR_TEX = 128; // texture edge (px)
export const STAR_CORE_R = 36; // core disc radius in texture px == Arcade body radius
export const GLOW_TEX = 192;

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

export function makeStarTextures(scene) {
  const tex = scene.textures;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const bake = (key, w, h, draw) => {
    if (tex.exists(key)) return;
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };

  for (const c of STAR_COLORS) {
    bake(`star-${c.key}`, STAR_TEX, STAR_TEX, () => drawCore(g, c.hex));
    bake(`glow-${c.key}`, GLOW_TEX, GLOW_TEX, () => drawGlow(g, c.hex));
  }
  for (const s of FURNACE_STAGES) {
    bake(`furnace-${s.key}`, STAR_TEX, STAR_TEX, () => drawFurnace(g, s.hex));
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

/** Texture key for a pooled object's look. */
export function textureFor(kind, colorKey) {
  if (kind === 'furnace') return `furnace-${colorKey}`;
  if (kind === 'asteroid') return 'asteroid';
  return `star-${colorKey}`;
}
