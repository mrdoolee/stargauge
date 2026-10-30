import { FURNACE_STAGES } from './temperature.js';
import { FURNACE_STAGE_CUTS } from '../config/balance.js';

/** Stage key of a cooling furnace blob given the fraction (0..1) of its fall completed. */
export function furnaceStageAt(fraction) {
  let i = 0;
  for (const cut of FURNACE_STAGE_CUTS) if (fraction >= cut) i += 1;
  return FURNACE_STAGES[i].key;
}
