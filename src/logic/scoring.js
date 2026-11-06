import {
  STARS_THREE_MAX_WRONG, STARS_TWO_MAX_WRONG, CHARGE_STARS_THREE_MAX_WRONG, CHARGE_STARS_TWO_MAX_WRONG,
} from '../config/balance.js';

/** chargeMode (m3/m4): wrongShots are COUNTED bounces only and use the looser charge-mode thresholds. */
export function missionStars({ wrongShots, restarts, chargeMode = false }) {
  const three = chargeMode ? CHARGE_STARS_THREE_MAX_WRONG : STARS_THREE_MAX_WRONG;
  const two = chargeMode ? CHARGE_STARS_TWO_MAX_WRONG : STARS_TWO_MAX_WRONG;
  if (wrongShots <= three && restarts === 0) return 3;
  if (wrongShots <= two) return 2;
  return 1;
}
