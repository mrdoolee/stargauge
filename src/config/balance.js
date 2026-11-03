// Tunable balance values (starting points).
export const HEAT_MAX = 100;
export const COOL_PER_SEC = 4;
export const MAX_DT_MS = 100;
export const STAR_HEAT = { blue: 30, blueWhite: 25, white: 20, yellowWhite: 16, yellow: 12, orange: 8, red: 5 };
export const FURNACE_HEAT = { white: 25, yellow: 15, orange: 9, red: 5 };
export const ASTEROID_HEAT = 15;
export const WRONG_SHOT_HEAT = 5;

// Task 5 additions
export const M4_TIME_LIMIT_SEC = 210;
export const SPAWN_INTERVAL_MS = { m1: 1100, m2: 2400, m3: 1400, m4: 800 };
export const SPAWN_NEEDED_GUARANTEE = 3; // force a needed color after this many misses
export const MISSION_GOAL_COUNTS = { m1: 8, m3a: 1 };
export const STARS_THREE_MAX_WRONG = 1;
export const STARS_TWO_MAX_WRONG = 4;

// Task 6 additions — touch controls, ship, beam, pools, HUD layout.
// Controls revised 2026-10-31 (teacher field test): fixed virtual joystick bottom-left (left thumb)
// + fire button bottom-right (right thumb), both semi-transparent over the play field.
export const SHIP_BODY_RADIUS = 18;
export const SHIP_HALF_HEIGHT = 38; // the 64x76 ship sprite; shipMaxY() input
export const BEAM_SPAWN_OFFSET_Y = 44; // a beam spawns this far above the ship centre
export const SHIP_START_Y = 900; // must stay <= the control line (shipMaxY() = 960 with the values below)
export const SHIP_BOUNDS = { minX: 40, maxX: 680, minY: 320 }; // maxY is derived: shipMaxY() in TouchControls.js
export const SHIP_MAX_SPEED = 520; // px/s at full joystick deflection (crosses the 640 px wide field in ~1.2 s)
export const SHIP_CONTROL_CLEARANCE = 24; // px gap between the ship's bottom edge and the top of the controls
export const JOYSTICK_DIAMETER = 200; // drawn outer ring
export const JOYSTICK_MARGIN = 28; // from the left and bottom screen edges
export const JOYSTICK_DEAD_ZONE = 0.12; // fraction of the ring radius that reads as "no push"
export const JOYSTICK_HIT_SCALE = 1.3; // touch area radius = ring radius x this (kinder to thumbs)
export const FIRE_BUTTON_DIAMETER = 150; // brief: >= 120 at 720 wide
export const FIRE_BUTTON_MARGIN = 28; // brief: safe margin >= 24
export const CONTROLS_ALPHA = 0.45; // joystick + fire button at rest (objects stay visible behind them)
export const CONTROLS_ACTIVE_ALPHA = 0.75; // while a thumb is on the control
export const BEAM_SPEED = 1200; // px/s; brief: <= 1400 so beams can't skip a star
export const BEAM_BODY_W = 12;
export const BEAM_BODY_H = 32; // brief: >= 24 (20 px travelled per 60 Hz step < 32)
export const POOL_STARS = 48;
export const POOL_BEAMS = 16;
export const POOL_ASTEROIDS = 12;
export const CULL_MARGIN = 120; // release pooled objects this far past the screen edge
export const COLLISION_COOLDOWN_MS = 1000; // persistent objects (boss, constellation) re-hit delay
export const MARK_FADE_MS = 450; // correct-star mark ring + fade before returning to the pool
export const RESTART_DELAY_MS = 600; // heat-full flash before the mission restarts
export const HUD_SAFE_MARGIN = 24;
export const TOAST_MS = 2400;
// HUD band heights (HudScene draws them). Falling objects are hidden/dimmed above HUD_BAND_BOTTOM.
export const HUD_PANEL_H = 248; // top panel: buttons, heat bar, gauge
export const HUD_INSTRUCTION_H = 96; // instruction strip under the panel
export const HUD_BAND_BOTTOM = HUD_PANEL_H + HUD_INSTRUCTION_H; // 344
export const HUD_TOAST_LOW_Y = 660; // top of a 'low' toast (m1: keeps the white zone 344-624 clear)

// Task 7 additions — mission 1 (furnace) and mission 2 (star gauge).
export const M1_PRACTICE_SEC = 30; // no asteroids / no ship-collision heat during this time
// Cooling is measured from below the HUD band (a blob is white while hidden under the HUD and for
// 0.4 * 700 = 280 px after it, i.e. visibly white from y 344 to ~624; yellow ~624, orange ~778, red ~918).
export const M1_COOL_START_Y = HUD_BAND_BOTTOM; // fall fraction starts counting here
export const M1_FALL_DISTANCE = 700; // px below M1_COOL_START_Y to "fully cooled"
export const M1_WHITE_GRACE_MS = 300; // a hit still counts as white this long after the blob left white
export const M1_PRACTICE_TOAST_GAP_MS = 6000; // practice feedback toast: first time, then at most this often
export const FURNACE_STAGE_CUTS = [0.4, 0.62, 0.82]; // fall fraction where white->yellow->orange->red
export const M1_ASTEROID_INTERVAL_MS = 4000;
export const M1_BLOB_SPEED = { min: 150, max: 210 };
export const M2_STAR_SPEED = { min: 170, max: 250 };
export const M2_STAR_SCALE = { min: 0.7, max: 1.5 };
export const M2_SPAWN_MIN_GAP_X = 120; // px: a new star spawns at least this far (x) from the previous one

// Task 9 additions — mission 4 (jewel box cluster boss).
export const M4_SCATTER_INTERVAL_MS = 2200; // a scattered blue star leaves the cluster this often
export const M4_SCATTER_SPEED = { min: 230, max: 310 };
export const M4_SCATTER_SCALE = 0.42;
export const M4_CLUSTER_AREA = { x: 80, y: 440, w: 560, h: 340 }; // where the normalized JEWELBOX layout is placed
export const M4_SWAY = { amp: 26, periodMs: 5200, bossAmp: 40, bossPeriodMs: 7600 };
export const M4_STAR_SCALE = 0.9; // JEWELBOX size multiplier -> sprite scale

// Difficulty (2026-10-31). Multipliers on the base values above; `normal` is 1 everywhere = the shipped feel.
// speed: every falling/moving hazard or target (m1 blobs + asteroids, m2 stars, m3 traps + constellation drift,
// m4 scattered stars). spawnInterval: SPAWN_INTERVAL_MS, M1_ASTEROID_INTERVAL_MS, M4_SCATTER_INTERVAL_MS
// (larger = fewer objects). heat: ship-collision heat only (not WRONG_SHOT_HEAT, not cooling).
export const DIFFICULTY_MULTIPLIERS = {
  easy: { speed: 0.75, spawnInterval: 1.35, heat: 0.6 },
  normal: { speed: 1, spawnInterval: 1, heat: 1 },
  hard: { speed: 1.3, spawnInterval: 0.75, heat: 1.35 },
};
export const DIFFICULTY_LABELS = { easy: '쉬움', normal: '중간', hard: '어려움' };

// Rank / tension (2026-11-03). value = start - mercy + survivalSteps + correct * perCorrect.
// Easy ignores it (tier 0, no aiming). Tier = last index i with value >= RANK_TIER_AT[i].
export const RANK_START = { easy: 0, normal: 2, hard: 5 };
export const RANK_SURVIVAL = { firstStepMs: 30000, stepMs: 20000, maxSteps: 8 };
export const RANK_PER_CORRECT = 0.5;
export const RANK_MERCY_PER_RESTART = 2;
export const RANK_MERCY_MAX_RESTARTS = 2;
export const RANK_TIER_AT = [0, 4, 7, 10];
export const RANK_AIM_MIN = 4; // aimed shots allowed from this value (never on easy)

// Speed bands / reaction floors (2026-11-03). Bands are in screen heights per second (H/s, H = 1280 px).
// Band bottom = tension tier 0 minimum, top = tier 3 maximum; easy uses the whole band (no tiers).
export const SPEED_BANDS_H = {
  target: { easy: [0.10, 0.15], normal: [0.25, 0.35], hard: [0.35, 0.45] },
  hazard: { easy: [0.09, 0.18], normal: [0.375, 0.55], hard: [0.5, 0.75] },
};
// Minimum seconds the student gets to react to a hazard / target.
export const REACTION_FLOOR_SEC = {
  target: { easy: 2.0, normal: 1.0, hard: 0.8 },
  hazard: { easy: 1.2, normal: 0.7, hard: 0.5 },
};
export const AIM_MAX_ANGLE_DEG = 35; // aimed shots deviate at most this far from straight down

// Formation shapes (src/logic/formations.js)
export const FORMATION_LINE_STAGGER_MS = 150;
export const FORMATION_VEE_SPACING_PX = 110;
export const FORMATION_VEE_RANK_MS = 300;
export const FORMATION_VEE_LEAN_PX = 60;
export const FORMATION_DIAGONAL_STEP_PX = 100;
export const FORMATION_DIAGONAL_STEP_MS = 300;
export const FORMATION_DRIFT_VX = 60; // px/s sideways drift for diagonal / pincer
export const FORMATION_PINCER_PAIR_MS = 500;
export const FORMATION_PINCER_EDGE_JITTER_PX = 30;
export const FORMATION_ZIGZAG_AMP_PX = 80;
export const FORMATION_ZIGZAG_PERIOD_MS = 1800;
export const FORMATION_ZIGZAG_STEP_MS = 300;
export const FORMATION_EDGE_JITTER_PX = 40; // random start offset for diagonal / zigzag edge sides
export const FORMATION_ZIGZAG_CENTER_JITTER_PX = 60;
export const FORMATION_GAP_WINDOW_MS = 400; // slots this close in time count as the same row
export const FORMATION_OBJECT_WIDTH = 72; // body diameter = 2 x STAR_CORE_R (36) in src/objects/starTextures.js

// Wave director (src/logic/waves.js)
export const WARMUP_MS = 12000; // first seconds of a run: thinner formations, no aimed shots
export const WARMUP_DENSITY = 0.7; // formation count multiplier while warming up (ceil, min 1)
export const FORMATION_GAP_MS = { m1: 2600, m2: 3200, m3: 2400, m4: 0 }; // rest between formations (scaled by difficulty spawnInterval)
export const RANK_GAP_SHRINK = 0.08; // rest shrinks by this fraction per tension tier
