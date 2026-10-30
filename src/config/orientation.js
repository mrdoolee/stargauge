// Rotate overlay: JS is the single source of truth. applyOrientation() toggles <html class="rotate">
// (index.html shows #rotate only through that class) and sleeps/wakes the game loop, so the CSS and
// the loop can never disagree. Any landscape on a touch device counts (phones AND tablets such as the
// Galaxy Tab S6 Lite); a desktop with a mouse is never blocked.
export const ROTATE_QUERY = '(orientation: landscape) and (pointer: coarse)';
export const ROTATE_CLASS = 'rotate';

// Pure decision: should the game loop be asleep behind the rotate overlay?
export function shouldSleep(isLandscapeTouch) {
  return Boolean(isLandscapeTouch);
}

/**
 * Apply the orientation state. root: document.documentElement; loop: game.loop (Phaser TimeStep).
 * The loop is only touched once it has started (before that, sleep/wake would fight Phaser's boot);
 * onWake() is called when a sleeping loop is actually woken. Returns whether the game should sleep.
 */
export function applyOrientation(matches, { root = null, loop = null, onWake = null } = {}) {
  const sleep = shouldSleep(matches);
  root?.classList?.toggle(ROTATE_CLASS, sleep);
  if (loop?.started) {
    if (sleep) loop.sleep();
    else if (!loop.running) {
      loop.wake();
      onWake?.();
    }
  }
  return sleep;
}
