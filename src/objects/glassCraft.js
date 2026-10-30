// Code-drawn glass-craft picture for Q2: a glass piece on a blowpipe. (가) end glows yellow, (나) end glows red.
// Returns the created objects so the caller can manage depth/cleanup. Labels sit at the given anchors.
import Phaser from 'phaser';

const YELLOW = 0xffe27a;
const RED = 0xff3b2e;

function mix(a, b, t) {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.IntegerToColor(a), Phaser.Display.Color.IntegerToColor(b), 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

/** slot: { x, y, w, h } (y = top). anchors: { left:{x,y}, right:{x,y} }. */
export function drawGlassCraft(scene, slot, anchors, font) {
  const { x, y, w, h } = slot;
  const cy = y + h / 2;
  const g = scene.add.graphics();
  g.fillStyle(0x0b1020, 1);
  g.fillRoundedRect(x - w / 2, y, w, h, 14);
  g.lineStyle(3, 0x3a4a6a, 1);
  g.strokeRoundedRect(x - w / 2, y, w, h, 14);

  // blowpipe (right side)
  const rx = 215; // glass half-width
  g.fillStyle(0xb8c2cc, 1);
  g.fillRoundedRect(x + rx - 20, cy - 7, w / 2 - rx + 16, 14, 6);
  g.fillStyle(0x7d8896, 1);
  g.fillRect(x + rx - 20, cy + 2, w / 2 - rx + 16, 5);

  // glass piece as vertical strips: yellow on the left -> red on the right, with a soft halo
  const ry = 52;
  for (let dx = -rx; dx < rx; dx += 4) {
    const k = Math.sqrt(1 - (dx / rx) ** 2);
    const t = (dx + rx) / (2 * rx);
    const col = mix(YELLOW, RED, Math.min(1, Math.max(0, (t - 0.35) / 0.3)));
    g.fillStyle(col, 0.16);
    g.fillRect(x + dx, cy - (ry + 22) * k, 4, 2 * (ry + 22) * k);
    g.fillStyle(col, 1);
    g.fillRect(x + dx, cy - ry * k, 4, 2 * ry * k);
  }
  // glass highlight
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(x - 20, cy - 30, 190, 14);

  const style = { fontFamily: font, fontSize: '40px', fontStyle: 'bold', color: '#ffffff', stroke: '#101424', strokeThickness: 7 };
  const a = scene.add.text(anchors.left.x, anchors.left.y, '(가)', style).setOrigin(0.5);
  const b = scene.add.text(anchors.right.x, anchors.right.y, '(나)', style).setOrigin(0.5);
  return [g, a, b];
}
