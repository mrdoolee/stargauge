import { STARS_THREE_MAX_WRONG, STARS_TWO_MAX_WRONG } from '../config/balance.js';

export function missionStars({ wrongShots, restarts }) {
  if (wrongShots <= STARS_THREE_MAX_WRONG && restarts === 0) return 3;
  if (wrongShots <= STARS_TWO_MAX_WRONG) return 2;
  return 1;
}
