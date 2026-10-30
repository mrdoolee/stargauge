import * as P from '../config/palette.js';

// rank 0 = hottest
export const STAR_COLORS = [
  { key: 'blue', label: '청색', hex: P.COLOR_BLUE, rank: 0 },
  { key: 'blueWhite', label: '청백색', hex: P.COLOR_BLUE_WHITE, rank: 1 },
  { key: 'white', label: '백색', hex: P.COLOR_WHITE, rank: 2 },
  { key: 'yellowWhite', label: '황백색', hex: P.COLOR_YELLOW_WHITE, rank: 3 },
  { key: 'yellow', label: '황색', hex: P.COLOR_YELLOW, rank: 4 },
  { key: 'orange', label: '주황색', hex: P.COLOR_ORANGE, rank: 5 },
  { key: 'red', label: '적색', hex: P.COLOR_RED, rank: 6 },
];

export const SUN_KEY = 'yellow';

export const FURNACE_STAGES = [
  { key: 'white', label: '흰색', hex: P.COLOR_WHITE, rank: 0 },
  { key: 'yellow', label: '노란색', hex: P.COLOR_YELLOW, rank: 1 },
  { key: 'orange', label: '주황색', hex: P.COLOR_ORANGE, rank: 2 },
  { key: 'red', label: '붉은색', hex: P.COLOR_RED, rank: 3 },
];

export function colorByKey(key) {
  const c = STAR_COLORS.find(s => s.key === key);
  if (!c) throw new Error(`Unknown star color key: ${key}`);
  return c;
}

const rankOf = key => colorByKey(key).rank;

export const isHotter = (aKey, bKey) => rankOf(aKey) < rankOf(bKey);
export const hotterThanSun = key => isHotter(key, SUN_KEY);
export const coolerThanSun = key => isHotter(SUN_KEY, key);

export function sortHottestFirst(items, getKey = i => i.colorKey) {
  return [...items].sort((a, b) => rankOf(getKey(a)) - rankOf(getKey(b)));
}
