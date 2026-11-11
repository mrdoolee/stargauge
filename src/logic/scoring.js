import {
  STARS_THREE_MAX_WRONG, STARS_TWO_MAX_WRONG, CHARGE_STARS_THREE_MAX_WRONG, CHARGE_STARS_TWO_MAX_WRONG, STARS_TIMEOUT_MAX,
} from '../config/balance.js';

/**
 * chargeMode (m3/m4): wrongShots are COUNTED bounces only and use the looser charge-mode thresholds.
 * timedOut (m4: the time limit ran out before the boss fell) caps the rating at STARS_TIMEOUT_MAX.
 */
export function missionStars({ wrongShots, restarts, chargeMode = false, timedOut = false }) {
  const three = chargeMode ? CHARGE_STARS_THREE_MAX_WRONG : STARS_THREE_MAX_WRONG;
  const two = chargeMode ? CHARGE_STARS_TWO_MAX_WRONG : STARS_TWO_MAX_WRONG;
  let stars = 1;
  if (wrongShots <= three && restarts === 0) stars = 3;
  else if (wrongShots <= two) stars = 2;
  return timedOut ? Math.min(stars, STARS_TIMEOUT_MAX) : stars;
}
