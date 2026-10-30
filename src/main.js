import { GAME_WIDTH, GAME_HEIGHT } from './config/game.js';
import { LANDSCAPE_SMALL_QUERY, shouldSleep } from './config/orientation.js';

export { GAME_WIDTH, GAME_HEIGHT };

async function boot() {
  const { default: Phaser } = await import('phaser');
  const { default: BootScene } = await import('./scenes/BootScene.js');
  const { default: TitleScene } = await import('./scenes/TitleScene.js');
  const { default: CardScene } = await import('./scenes/CardScene.js');
  const { default: M3TrapScene } = await import('./scenes/M3TrapScene.js');
  const { default: M4JewelboxScene } = await import('./scenes/M4JewelboxScene.js');
  const { default: HudScene } = await import('./scenes/HudScene.js');
  const { default: M1FurnaceScene } = await import('./scenes/M1FurnaceScene.js');
  const { default: M2GaugeScene } = await import('./scenes/M2GaugeScene.js');

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#05070f',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    physics: { default: 'arcade', arcade: { debug: false } },
    // Mission scenes (Tasks 7-9) go before HudScene; HudScene stays last so it draws on top
    // (missions also call bringToTop('hud')).
    scene: [BootScene, TitleScene, CardScene, M1FurnaceScene, M2GaugeScene, M3TrapScene, M4JewelboxScene, HudScene],
  });

  // Landscape on a short screen (phone) -> sleep the loop behind #rotate.
  const mq = window.matchMedia(LANDSCAPE_SMALL_QUERY);
  const sync = () => (shouldSleep(mq.matches) ? game.loop.sleep() : game.loop.wake());
  mq.addEventListener('change', sync);

  // 'ready' fires before loop.start(), when sleep() is a no-op (loop.running is
  // false). The first POST_STEP is emitted from inside a live step, so sleep()
  // takes effect there (raf stops rescheduling).
  game.events.once('poststep', sync);

  // Re-apply after tab/app switches. Phaser 4.2.1 only resetDelta()s on
  // visible/focus (it does not wake), but this keeps landscape asleep even if
  // that changes, and is a no-op otherwise.
  game.events.on('visible', sync);
  game.events.on('focus', sync);
}

// Importing this module in Node (vitest) just exposes the constants.
if (typeof window !== 'undefined') boot();
