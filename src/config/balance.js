// Tunable balance values (starting points).
export const HEAT_MAX = 100;
export const COOL_PER_SEC = 4;
export const MAX_DT_MS = 100;
export const STAR_HEAT = { blue: 30, blueWhite: 25, white: 20, yellowWhite: 16, yellow: 12, orange: 8, red: 5 };
export const FURNACE_HEAT = { white: 25, yellow: 15, orange: 9, red: 5 };
export const ASTEROID_HEAT = 15;
export const WRONG_SHOT_HEAT = 5;

// Task 5 additions
export const M4_TIME_LIMIT_SEC = 150;
export const SPAWN_INTERVAL_MS = { m1: 1100, m2: 900, m3: 1400, m4: 800 };
export const SPAWN_NEEDED_GUARANTEE = 3; // force a needed color after this many misses
export const MISSION_GOAL_COUNTS = { m1: 5, m3a: 1 };
export const STARS_THREE_MAX_WRONG = 1;
export const STARS_TWO_MAX_WRONG = 4;

// Task 6 additions — touch controls, ship, beam, pools, HUD layout.
// No prototype VERDICT yet: these are the prototype defaults (retune after the teacher's field test).
export const SHIP_OFFSET_Y = 140; // ship sits this far above the finger (game px)
export const SHIP_FOLLOW_REMAIN_PER_SEC = 0.0001; // fraction of the gap left after 1 s of easing
export const SHIP_BODY_RADIUS = 18;
export const SHIP_START_Y = 1000;
export const SHIP_BOUNDS = { minX: 40, maxX: 680, minY: 320, maxY: 1220 };
export const FIRE_BUTTON_DIAMETER = 140; // brief: >= 120 at 720 wide
export const FIRE_BUTTON_MARGIN = 28; // brief: safe margin >= 24
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

// Task 7 additions — mission 1 (furnace) and mission 2 (star gauge).
export const M1_PRACTICE_SEC = 30; // no asteroids / no ship-collision heat during this time
export const M1_FALL_DISTANCE = 1100; // px a blob falls from spawn to "fully cooled"
export const FURNACE_STAGE_CUTS = [0.4, 0.62, 0.82]; // fall fraction where white->yellow->orange->red
export const M1_ASTEROID_INTERVAL_MS = 4000;
export const M1_BLOB_SPEED = { min: 150, max: 210 };
export const M2_STAR_SPEED = { min: 170, max: 250 };
export const M2_STAR_SCALE = { min: 0.7, max: 1.5 };

// Task 9 additions — mission 4 (jewel box cluster boss).
export const M4_SCATTER_INTERVAL_MS = 2200; // a scattered blue star leaves the cluster this often
export const M4_SCATTER_SPEED = { min: 230, max: 310 };
export const M4_SCATTER_SCALE = 0.42;
export const M4_CLUSTER_AREA = { x: 80, y: 440, w: 560, h: 340 }; // where the normalized JEWELBOX layout is placed
export const M4_SWAY = { amp: 26, periodMs: 5200, bossAmp: 70, bossPeriodMs: 7600 };
export const M4_STAR_SCALE = 0.9; // JEWELBOX size multiplier -> sprite scale
