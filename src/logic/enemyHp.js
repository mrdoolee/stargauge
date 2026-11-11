/** Fill fraction of a small hp bar: hp / maxHp clamped to 0..1 (0 when maxHp <= 0 or hp <= 0). */
export function hpBarFraction(hp, maxHp) {
  if (!(maxHp > 0) || !(hp > 0)) return 0;
  return Math.min(1, hp / maxHp);
}

/**
 * y of a small hp bar glued to an enemy. offY is the (negative) offset that puts it above the enemy;
 * if that would put the bar's top above minTop (the HUD band's bottom) it is mirrored below the enemy instead.
 */
export function hpBarY(enemyY, offY, barH, minTop) {
  const above = enemyY + offY;
  return above - barH / 2 < minTop ? enemyY - offY : above;
}
