// Orion + Sirius completion figure (real star colors, marked stars ringed). Shared by M3's picture and the result thumbnail.
import Phaser from 'phaser';
import { fitLayout, toScreen } from '../logic/constellation.js';
import { NAMED_STARS, ORION_BACKGROUND, CONSTELLATION_POS } from '../data/stars.js';
import { sortHottestFirst } from '../logic/temperature.js';

export const BELT = ['alnitak', 'alnilam', 'mintaka'];
// Simplified figure: pairs of ids drawn as lines.
export const ORION_LINES = [
  ['betelgeuse', 'bellatrix'], ['betelgeuse', 'alnitak'], ['bellatrix', 'mintaka'],
  ['alnitak', 'alnilam'], ['alnilam', 'mintaka'], ['alnitak', 'saiph'], ['mintaka', 'rigel'],
];

/**
 * Draws lines, glows, stars and gold rings for tagged named stars. `k` scales star sprites (1 = full picture).
 * Returns { pos, items:[{p,x,y,size,hi}] } so callers can add their own labels.
 */
export function drawOrionFigure(scene, { box, depth, tagged = [], k = 1, lineWidth = 4 }) {
  const named = sortHottestFirst(Object.values(NAMED_STARS));
  const pts = [
    ...ORION_BACKGROUND.map(b => ({ ...b, named: false })),
    ...named.map(s => ({ ...s, ...CONSTELLATION_POS[s.id], named: true })),
  ];
  const { origin, scale } = fitLayout(pts, box);
  const pos = Object.fromEntries(pts.map(p => [p.id, toScreen(p, origin, scale)]));

  const g = scene.add.graphics().setDepth(depth);
  g.lineStyle(lineWidth, 0x6f86b3, 0.8);
  for (const [a, b] of ORION_LINES) g.lineBetween(pos[a].x, pos[a].y, pos[b].x, pos[b].y);

  const items = [];
  for (const p of pts) {
    const { x, y } = pos[p.id];
    const size = (p.named ? p.size * 0.75 : p.size * 0.6) * k;
    scene.add.image(x, y, `glow-${p.colorKey}`).setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(size * 0.9).setAlpha(0.35 + p.glow * 0.5);
    scene.add.image(x, y, `star-${p.colorKey}`).setDepth(depth + 1).setScale(size);
    const hi = p.named && tagged.includes(p.id);
    if (hi) scene.add.image(x, y, 'fx-ring').setDepth(depth + 2).setScale(size * 1.2).setTint(0xffe27a);
    items.push({ p, x, y, size, hi });
  }
  return { pos, items };
}
