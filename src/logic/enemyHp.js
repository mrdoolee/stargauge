/** Fill fraction of a small hp bar: hp / maxHp clamped to 0..1 (0 when maxHp <= 0 or hp <= 0). */
export function hpBarFraction(hp, maxHp) {
  if (!(maxHp > 0) || !(hp > 0)) return 0;
  return Math.min(1, hp / maxHp);
}
