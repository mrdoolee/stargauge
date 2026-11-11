import { STARS_THREE_MAX_WRONG, STARS_TWO_MAX_WRONG, STARS_TIMEOUT_MAX } from '../config/balance.js';

/** 1-3 stars from wrong shots and restarts; timedOut (m4 time limit before the boss fell) caps it at STARS_TIMEOUT_MAX. */
export function missionStars({ wrongShots, restarts, timedOut = false }) {
  let stars = 1;
  if (wrongShots <= STARS_THREE_MAX_WRONG && restarts === 0) stars = 3;
  else if (wrongShots <= STARS_TWO_MAX_WRONG) stars = 2;
  return timedOut ? Math.min(stars, STARS_TIMEOUT_MAX) : stars;
}
