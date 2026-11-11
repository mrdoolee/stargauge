// 7-cell star gauge drawing, shared by HudScene and CardScene.
// Cell order = STAR_COLORS rank (청색 hottest, left → 적색 coolest, right), i.e. textbook fig. 8-5.

import { STAR_COLORS } from '../logic/temperature.js';

export const FONT = 'Orbit, "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

const ORDERED = [...STAR_COLORS].sort((a, b) => a.rank - b.rank);

/**
 * @param scene
 * @param {{x:number,y:number,cellW:number,cellH:number,gap:number,colorLabels?:boolean,fontSize?:number}} o
 *   x,y = top-left of the first cell.
 * @returns {{ setFilled(keys:string[]):void, cellCenterX(key:string):number, width:number, objects:any[] }}
 */
export function createGaugeView(scene, { x, y, cellW, cellH, gap, colorLabels = false, fontSize = 28 }) {
  const g = scene.add.graphics();
  const objects = [g];
  const width = ORDERED.length * cellW + (ORDERED.length - 1) * gap;
  const cx = i => x + i * (cellW + gap) + cellW / 2;

  if (colorLabels) {
    ORDERED.forEach((c, i) => {
      objects.push(
        scene.add
          .text(cx(i), y + cellH + 8, c.label, { fontFamily: FONT, fontSize: `${fontSize}px`, color: '#e8ecff' })
          .setOrigin(0.5, 0),
      );
    });
  }

  const setFilled = keys => {
    const filled = new Set(keys);
    g.clear();
    ORDERED.forEach((c, i) => {
      const left = x + i * (cellW + gap);
      const on = filled.has(c.key);
      // Empty cells keep a faint hint of their color so the ladder reads even before filling.
      g.fillStyle(c.hex, on ? 1 : 0.18);
      g.fillRoundedRect(left, y, cellW, cellH, 8);
      g.lineStyle(on ? 4 : 2, on ? 0xffffff : 0x8890a8, on ? 1 : 0.8);
      g.strokeRoundedRect(left, y, cellW, cellH, 8);
    });
  };
  setFilled([]);

  return {
    setFilled,
    cellCenterX: key => cx(ORDERED.findIndex(c => c.key === key)),
    width,
    objects,
  };
}
