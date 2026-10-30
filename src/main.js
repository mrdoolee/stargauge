import { GAME_WIDTH, GAME_HEIGHT } from './config/game.js';

export { GAME_WIDTH, GAME_HEIGHT };

// Phaser touches `window` on import, so boot it only in a browser.
// Importing this module in Node (vitest) just exposes the constants.
if (typeof window !== 'undefined') {
  const { default: Phaser } = await import('phaser');
  const { default: BootScene } = await import('./scenes/BootScene.js');
  const { default: TitleScene } = await import('./scenes/TitleScene.js');

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#05070f',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [BootScene, TitleScene],
  });

  // Landscape on a short screen (phone) -> pause and show the #rotate overlay.
  const mq = window.matchMedia('(orientation: landscape) and (max-height: 600px)');
  const sync = () => (mq.matches ? game.loop.sleep() : game.loop.wake());
  mq.addEventListener('change', sync);
  if (mq.matches) game.events.once('ready', sync);
}
