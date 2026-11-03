// Vertical-scrolling background layers. createParallax(scene, [{ key, speedPxS, depth?, alpha? }]) -> { update(dtMs) }.
// Keys whose image is not loaded are skipped (the dark background stays). Layers sit far below gameplay (depth -10 + i*0.1).
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';

export const PARALLAX_SPACE = [
  { key: 'bg-space-far', speedPxS: 15 },
  { key: 'bg-space-near', speedPxS: 40, alpha: 0.6 },
];

export function createParallax(scene, layers) {
  const tiles = [];
  layers.forEach((l, i) => {
    if (!scene.textures.exists(l.key)) return;
    const t = scene.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, l.key)
      .setDepth(l.depth ?? -10 + i * 0.1)
      .setAlpha(l.alpha ?? 1);
    // the source image may not be 720 wide: fit it to the screen width
    const src = scene.textures.get(l.key).getSourceImage();
    if (src.width !== GAME_WIDTH) t.setTileScale(GAME_WIDTH / src.width);
    tiles.push({ t, speed: l.speedPxS });
  });
  return {
    tiles: tiles.map(x => x.t),
    update(dtMs) {
      for (const x of tiles) x.t.tilePositionY -= (x.speed * dtMs) / 1000; // content drifts downward
    },
  };
}
