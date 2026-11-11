import { describe, it, expect } from 'vitest';
import { ellipseRingPixels, bossShieldGeometry, bossShieldTextureKey } from '../../src/objects/starTextures.js';
import { tintPixels } from '../../src/objects/tint.js';
import { STAR_COLORS } from '../../src/logic/temperature.js';
import { BOSS_ART, BOSS_WIDTH_PX, BOSS_POS, BOSS_MUZZLE_DY, SHIP_START_Y } from '../../src/config/balance.js';

const ch = hex => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const k = BOSS_WIDTH_PX / BOSS_ART.canvasW;
const hullW = BOSS_ART.hull.w * k;
const hullH = BOSS_ART.hull.h * k;

describe('boss shield geometry (screen px, final-review m2)', () => {
  it('hugs the hull: rx, ry outside the hull half size but at most 16 px beyond it', () => {
    const g = bossShieldGeometry();
    expect(g.rx).toBeGreaterThan(hullW / 2);
    expect(g.ry).toBeGreaterThan(hullH / 2);
    expect(g.rx).toBeLessThanOrEqual(hullW / 2 + 16);
    expect(g.ry).toBeLessThanOrEqual(hullH / 2 + 16);
    expect(g.w).toBeGreaterThanOrEqual(2 * (g.rx + g.lineW / 2));
    expect(g.h).toBeGreaterThanOrEqual(2 * (g.ry + g.lineW / 2));
  });
  it('the hull bbox centre is the canvas centre, so the ring centred on the boss sits on the hull', () => {
    const h = BOSS_ART.hull;
    expect(h.x + h.w / 2).toBe(BOSS_ART.canvasW / 2);
    expect(h.y + h.h / 2).toBe(BOSS_ART.canvasH / 2);
  });
  it('is much smaller than the old round ring (radius 56 x 0.8 x 3.75 = 168 px): the ring bottom sits just under the hull bottom (muzzle)', () => {
    const g = bossShieldGeometry();
    const ringBottom = BOSS_POS.y + g.ry + g.lineW / 2;
    const hullBottom = BOSS_POS.y + BOSS_MUZZLE_DY;
    expect(ringBottom).toBeGreaterThan(hullBottom);
    expect(ringBottom - hullBottom).toBeLessThanOrEqual(20);
    expect(ringBottom).toBeLessThan(SHIP_START_Y - 200);
  });
  it('texture key per color', () => {
    expect(bossShieldTextureKey('blue')).toBe('shield-boss-blue');
  });
});

describe('ellipseRingPixels', () => {
  const W = 120;
  const H = 80;
  const rx = 50;
  const ry = 30;
  const lw = 8;
  const px = ellipseRingPixels(W, H, rx, ry, lw);
  const cx = (W - 1) / 2;
  const cy = (H - 1) / 2;
  const alpha = (x, y) => px[(y * W + x) * 4 + 3];
  it('white rgb everywhere, alpha only on the ellipse line', () => {
    expect(px.length).toBe(W * H * 4);
    for (let i = 0; i < px.length; i += 4) expect([px[i], px[i + 1], px[i + 2]]).toEqual([255, 255, 255]);
    expect(alpha(Math.round(cx), Math.round(cy))).toBe(0);
    expect(alpha(Math.round(cx + rx), Math.round(cy))).toBe(255);
    expect(alpha(Math.round(cx), Math.round(cy + ry))).toBe(255);
    expect(alpha(Math.round(cx), Math.round(cy - ry))).toBe(255);
    expect(alpha(0, 0)).toBe(0);
  });
  it('keeps one line thickness on the long and the short axis (within 2 px)', () => {
    let side = 0;
    for (let x = Math.round(cx); x < W; x++) if (alpha(x, Math.round(cy)) >= 128) side += 1;
    let top = 0;
    for (let y = 0; y <= Math.round(cy); y++) if (alpha(Math.round(cx), y) >= 128) top += 1;
    expect(Math.abs(side - lw)).toBeLessThanOrEqual(2);
    expect(Math.abs(top - lw)).toBeLessThanOrEqual(2);
  });
  it.each(STAR_COLORS.map(c => [c.key, c.hex]))('tinted opaque ring pixels are exactly the palette hex (%s)', (_k, hex) => {
    const out = tintPixels(px, hex);
    let n = 0;
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] === 0) continue;
      n += 1;
      expect([out[i], out[i + 1], out[i + 2]]).toEqual(ch(hex));
    }
    expect(n).toBeGreaterThan(0);
  });
});
