// Media query matching the #rotate overlay in index.html.
export const LANDSCAPE_SMALL_QUERY = '(orientation: landscape) and (max-height: 600px)';

// Pure decision: should the game loop be asleep behind the rotate overlay?
export function shouldSleep(isLandscapeSmall) {
  return Boolean(isLandscapeSmall);
}
