// Facts: Rigel (blue-white), Sirius (white), Betelgeuse (red supergiant).
export const NAMED_STARS = {
  rigel: { id: 'rigel', name: '리겔', colorKey: 'blueWhite', size: 1.0, glow: 0.8, constellation: 'orion' },
  sirius: { id: 'sirius', name: '시리우스', colorKey: 'white', size: 0.9, glow: 1.0, constellation: 'canisMajor' },
  betelgeuse: { id: 'betelgeuse', name: '베텔게우스', colorKey: 'red', size: 1.8, glow: 0.8, constellation: 'orion' },
};

// Non-targetable backdrop; real colors. North up, east left.
const bg = (id, name, colorKey, x, y) => ({
  id, name, colorKey, x, y, size: 0.7, glow: 0.4, targetable: false, constellation: 'orion',
});
export const ORION_BACKGROUND = [
  bg('bellatrix', '벨라트릭스', 'blueWhite', 0.70, 0.20),
  bg('alnitak', '알니탁', 'blue', 0.42, 0.50),
  bg('alnilam', '알닐람', 'blue', 0.50, 0.48),
  bg('mintaka', '민타카', 'blue', 0.58, 0.45),
  bg('saiph', '사이프', 'blue', 0.35, 0.85),
];

// Normalized layout of the three judged stars in the completed constellation picture.
export const CONSTELLATION_POS = {
  betelgeuse: { x: 0.25, y: 0.15 },
  rigel: { x: 0.75, y: 0.82 },
  sirius: { x: -0.35, y: 1.45 },
};

// Simplified picture based on the real Jewel Box cluster.
const jb = (id, colorKey, size, glow, x, y, extra = {}) => ({ id, colorKey, size, glow, x, y, ...extra });
export const JEWELBOX = [
  jb('jb1', 'blue', 0.6, 0.9, 0.30, 0.25),
  jb('jb2', 'blue', 0.5, 0.8, 0.70, 0.20),
  jb('jb3', 'blue', 0.6, 0.9, 0.22, 0.65),
  jb('jb4', 'blue', 0.5, 0.8, 0.80, 0.70),
  jb('jb5', 'blueWhite', 0.6, 0.8, 0.45, 0.15),
  jb('jb6', 'blueWhite', 0.5, 0.7, 0.60, 0.35),
  jb('jb7', 'blueWhite', 0.6, 0.8, 0.35, 0.50),
  jb('jb8', 'blueWhite', 0.5, 0.7, 0.68, 0.60),
  jb('jb9', 'blueWhite', 0.5, 0.7, 0.55, 0.85),
  jb('jb10', 'white', 0.5, 0.6, 0.15, 0.40),
  jb('jb11', 'white', 0.5, 0.6, 0.88, 0.40),
  jb('jb12', 'red', 1.6, 0.8, 0.50, 0.55, { isSupergiant: true }),
];
export const JEWELBOX_NOTE = '실제 성단을 바탕으로 단순화했어요';
