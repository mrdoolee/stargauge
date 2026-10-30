// Pure layout helpers for the mission-3 constellation group (normalized coords: north up, east left).

/** Normalized point -> screen point for a group whose normalized (0,0) sits at `origin`. */
export function toScreen(p, origin, scale) {
  return { x: origin.x + p.x * scale, y: origin.y + p.y * scale };
}

/**
 * Drift the group's top edge `groupY` down; once the whole group (`height` tall) is off the bottom
 * of the screen, wrap back above the top edge.
 */
export function advanceGroup(groupY, dtMs, { speed, height, screenH, margin = 0 }) {
  const y = groupY + (speed * dtMs) / 1000;
  return y > screenH + margin ? -height - margin : y;
}

/** Scale + origin that fit every point (with x,y) into `box` {x,y,w,h}, centered, aspect kept. */
export function fitLayout(points, box) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min(box.w / (maxX - minX), box.h / (maxY - minY));
  const origin = {
    x: box.x + (box.w - (maxX - minX) * scale) / 2 - minX * scale,
    y: box.y + (box.h - (maxY - minY) * scale) / 2 - minY * scale,
  };
  return { origin, scale };
}
