import { GAME_WIDTH, GAME_HEIGHT } from './config/game.js';
import { ROTATE_QUERY, applyOrientation } from './config/orientation.js';
import { showBootError } from './config/bootError.js';
import { loadGameFont } from './config/fontLoad.js';
import { parseDebug, debugRegistryDefaults } from './config/debug.js';

export { GAME_WIDTH, GAME_HEIGHT };

async function boot() {
  // Rotate overlay first (before the Phaser chunk loads), so landscape shows #rotate right away.
  // JS is the only thing that shows it: CSS reads <html class="rotate"> (see config/orientation.js).
  const mq = window.matchMedia(ROTATE_QUERY);
  let game = null;
  let bgm = null; // loaded below; sync() runs once before that
  const sync = () => {
    bgm?.setSuspended('rotate', mq.matches); // music follows the landscape sleep
    return applyOrientation(mq.matches, {
      root: document.documentElement,
      loop: game?.loop,
      onWake: () => game.events.emit('loop-wake'), // DebugFpsScene ignores the first frames after this
    });
  };
  sync();
  mq.addEventListener('change', sync);

  const dbg = parseDebug(window.location.search); // ?debug=1 [&mission=m1|m2|m3|m4|report]
  const { default: Phaser } = await import('phaser');
  const { sfx } = await import('./audio/sfx.js');
  sfx.installUnlock(window); // AudioContext is created/resumed on the first touch
  ({ bgm } = await import('./audio/bgm.js')); // starts the wanted track on that same first touch
  bgm.setSuspended('rotate', mq.matches); // landscape sleep = music paused too (re-applied in sync() below)
  document.addEventListener('visibilitychange', () => bgm.setSuspended('hidden', document.hidden));
  const { default: BootScene } = await import('./scenes/BootScene.js');
  const { default: TitleScene } = await import('./scenes/TitleScene.js');
  const { default: BriefingScene } = await import('./scenes/BriefingScene.js');
  const { default: CardScene } = await import('./scenes/CardScene.js');
  const { default: M3DroneScene } = await import('./scenes/M3DroneScene.js');
  const { default: M4BossScene } = await import('./scenes/M4BossScene.js');
  const { default: ReportScene } = await import('./scenes/ReportScene.js');
  const { default: ResultScene } = await import('./scenes/ResultScene.js');
  const { default: HudScene } = await import('./scenes/HudScene.js');
  const { default: M1FurnaceScene } = await import('./scenes/M1FurnaceScene.js');
  const { default: M2GaugeScene } = await import('./scenes/M2GaugeScene.js');

  let colorsView = false;
  const scenes = [BootScene, TitleScene, BriefingScene, CardScene, M1FurnaceScene, M2GaugeScene, M3DroneScene, M4BossScene, ReportScene, ResultScene, HudScene];
  if (dbg.debug) {
    const { default: DebugFpsScene } = await import('./scenes/DebugFpsScene.js');
    scenes.push(DebugFpsScene); // last = drawn on top; not even imported when debug is off
    if (new URLSearchParams(window.location.search).get('colors') === '1') {
      const { default: DebugColorsScene } = await import('./scenes/DebugColorsScene.js'); // ?debug=1&colors=1: the 7 star colors
      scenes.push(DebugColorsScene);
      colorsView = true;
    }
  }

  await loadGameFont(); // Orbit ready (max ~3 s, never throws) before any canvas text is drawn

  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#05070f',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    physics: { default: 'arcade', arcade: { debug: false } },
    // Mission scenes (Tasks 7-9) go before HudScene; HudScene stays last so it draws on top
    // (missions also call bringToTop('hud')).
    scene: scenes,
  });

  if (dbg.debug) {
    game.registry.set('debugFps', true); // BootScene launches the overlay scene
    if (dbg.mission) {
      // Debug shortcut: BootScene starts this scene instead of the title once loading is done.
      for (const [k, v] of Object.entries(debugRegistryDefaults())) game.registry.set(k, v);
      game.registry.set('debugStart', dbg.mission);
    }
    if (colorsView) game.registry.set('debugStart', 'debugcolors');
    if (dbg.difficulty) game.registry.set('difficulty', dbg.difficulty); // ?debug=1&difficulty=easy|normal|hard
  }

  // Landscape on a touch device (phone or tablet) -> sleep the loop behind #rotate.
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
if (typeof window !== 'undefined') {
  boot().catch(err => {
    // e.g. the Phaser chunk failed to load on school Wi-Fi: say so plainly instead of a black screen.
    console.error(err);
    showBootError(document);
  });
}
