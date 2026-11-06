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
export const MISSION_GOAL_COUNTS = { m1: 8 };
export const STARS_THREE_MAX_WRONG = 1;
export const STARS_TWO_MAX_WRONG = 4;
// Charge-mode missions (m3/m4): only COUNTED bounces are wrong (see bounceCounts in charge.js). Provisional values, 교사 확인 필요.
export const CHARGE_STARS_THREE_MAX_WRONG = 3;
export const CHARGE_STARS_TWO_MAX_WRONG = 8;

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
export const POOL_ENEMIES = 8; // shielded drones + the boss ship
export const POOL_BULLETS = 48; // enemy bullets (never targetable by beams)
export const ENEMY_BODY_R = 34; // enemy hitbox radius for an 80 px enemy texture (scales with sprite scale)
export const BULLET_BODY_R = 8;
export const BLOCKED_TOAST_MAX = 3; // "beam too weak" hints shown per run; later blocked hits only bounce
export const CULL_MARGIN = 120; // release pooled objects this far past the screen edge
export const COLLISION_COOLDOWN_MS = 1000; // persistent objects (the boss) re-hit delay
export const MARK_FADE_MS = 450; // correct-star mark ring + fade before returning to the pool
export const RESTART_DELAY_MS = 1800; // heat-full flash + centre banner before the mission restarts
export const TRANSITION_CLEAR_MS = 400; // stage change: stars/rocks/bullets fade out and return to the pool
export const TRANSITION_BANNER_MS = 2600; // stage change: the centre banner stays this long (only counts while the scene runs)
export const HUD_SAFE_MARGIN = 24;
export const TOAST_MS = 2400;
export const STRIP_HOLD_MS = 1200; // a priority strip message is not replaced by a plain one for this long
// HUD band heights (HudScene draws them). Falling objects are hidden/dimmed above HUD_BAND_BOTTOM.
export const HUD_PANEL_H = 248; // top panel: buttons, heat bar, gauge
export const HUD_INSTRUCTION_H = 96; // instruction strip under the panel
export const HUD_BAND_BOTTOM = HUD_PANEL_H + HUD_INSTRUCTION_H; // 344

// Task 7 additions — mission 1 (furnace) and mission 2 (star gauge).
export const M1_PRACTICE_SEC = 15; // no asteroids / no ship-collision heat during this time
// Cooling is measured from below the HUD band (a blob is white while hidden under the HUD and for
// 0.4 * 700 = 280 px after it, i.e. visibly white from y 344 to ~624; yellow ~624, orange ~778, red ~918).
export const M1_COOL_START_Y = HUD_BAND_BOTTOM; // fall fraction starts counting here
export const M1_FALL_DISTANCE = 700; // px below M1_COOL_START_Y to "fully cooled"
export const M1_WHITE_GRACE_MS = 300; // a hit still counts as white this long after the blob left white
export const M1_PRACTICE_TOAST_GAP_MS = 6000; // practice feedback toast: first time, then at most this often
export const FURNACE_STAGE_CUTS = [0.4, 0.62, 0.82]; // fall fraction where white->yellow->orange->red
export const M1_ASTEROID_SLOT_CHANCE = 0.2; // m1 test phase: chance a non-aimed formation slot is a straight-falling asteroid
export const M1_BLOB_SPEED = { min: 150, max: 210 };
export const M1_BLOB_START_WEIGHTS = { white: 0.4, yellow: 0.25, orange: 0.2, red: 0.15 }; // m1 blob starting color odds (only white scores)
export const M1_WHITE_GUARANTEE = 3; // after this many non-white starts in a row the next blob starts white
export const M2_STAR_SCALE = { min: 0.7, max: 1.5 };

// Task 9 additions — mission 4 (boss ship).
// Boss (2026-11-04): 3 stages by boss hp (BOSS_HP); each stage cycles attack window -> gap (no launches).
export const BOSS_ATTACK_MS = { 1: 4000, 2: 4500, 3: 5000 };
// Boss pressure (2026-11-07, teacher: "보스가 제일 쉽다", .superpowers/sdd/boss-hard/brief.md). The tables below are PER DIFFICULTY because
// the volley count of a window is ceil(attack / (interval x spawnInterval)) (a step function): the old shared table was tuned so that
// easy stays at 1-2 volleys per window, and any denser shared table would push easy past its dodge cap (difficulty.test.js, <= 0.4).
// Easy keeps the old numbers exactly; normal/hard are the new, harder values. All UNMEASURED: tune after classroom play.
// Rest after every attack window (no launches). Shorter = the student gets less free time to shoot; was 4500 for everyone.
export const BOSS_GAP_MS = { easy: 4500, normal: 3600, hard: 3200 };
// Launch interval inside an attack window, base value (x difficulty spawnInterval: easy 1.35, hard 0.75).
// Normal 2200/3400/3800 -> 2000/2800/3000 (2 volleys per window in every stage, the same count as before but the windows now repeat every
// ~7.6-8.6 s instead of ~8.5-9.5 s); hard: stage 1 three volleys per window, stages 2-3 two (3000/3400 x 0.75 = 2250/2550 ms).
export const BOSS_VOLLEY_MS = {
  easy: { 1: 2200, 2: 3400, 3: 3800 },
  normal: { 1: 2000, 2: 2800, 3: 3000 },
  hard: { 1: 1800, 2: 3000, 3: 3400 },
};
// Fan per volley in stages 2-3 (stage 1 is one straight shot). Normal/hard fans are wider and fuller (3-5 shots; at most 5 + 1 aimed per
// volley, so POOL_BULLETS 48 is plenty). A wider fan spreads its shots farther apart at the ship row, so BOSS_FAN_SHIP_HITS stays 1.5.
export const BOSS_FAN = {
  easy: { 2: { count: [2, 3], spreadDeg: 30 }, 3: { count: [2, 3], spreadDeg: 36 } },
  normal: { 2: { count: [3, 3], spreadDeg: 50 }, 3: { count: [3, 4], spreadDeg: 60 } },
  hard: { 2: { count: [3, 4], spreadDeg: 56 }, 3: { count: [4, 5], spreadDeg: 72 } },
};
// From this stage on, a volley also carries one aimed single shot (where aim is allowed: never on easy, never in the warm-up; before: stage 3 only).
export const BOSS_AIMED_FROM_STAGE = 2;
// Balance model: mean shots of one fan that hit a standing ship. 2-fans and far launches usually land one hit;
// a near 3-fan (launched 100-200 px above the ship, only 32-55 px wide at the ship row) can land two.
export const BOSS_FAN_SHIP_HITS = 1.5;
export const BOSS_GAP_DIM_ALPHA = 0.55;

// Difficulty (2026-10-31). Multipliers on the base values above; `normal` is 1 everywhere = the shipped feel.
// speed: every falling/moving hazard or target (m1 blobs + asteroids, m2 stars, m3 stars (the drone patrol DRONE_SPEED_X is a fixed px/s, not scaled),
// m4 charge stars). spawnInterval: FORMATION_GAP_MS, BOSS_VOLLEY_MS, SPAWN_INTERVAL_MS (m1 practice spawner only);
// larger = fewer objects. heat: ship-collision heat only (not WRONG_SHOT_HEAT, not cooling).
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
export const FORMATION_GAP_MS = { m1: 2100, m2: 4000, m3: 2400, m4: 3000 }; // rest between formations (scaled by difficulty spawnInterval)
export const RANK_GAP_SHRINK = 0.08; // rest shrinks by this fraction per tension tier
// Balance-model constants (difficulty.js / flow.js): formations are 3..5 objects; slot delays span ~0.7 s on average.
export const FORMATION_MEAN_SIZE = 4;
export const FORMATION_MEAN_SPAN_MS = 700;
// m3/m4 balance model only (difficulty.js). UNMEASURED tuning knob, like the PACE values in flow.js: tune after classroom play.
// Charge stars are targets the student shoots; this is the share of their slots the student neither shoots nor dodges.
export const MISSED_STAR_SHARE = 0.25;

// Missions 3/4 shooter: star-charged beam vs. colored shields (charge level = temperature color, 7 steps)
export const DRONE_SHIELDS = {
  easy: { yellowWhite: 0.4, white: 0.6 },
  normal: { white: 0.6, blueWhite: 0.4 },
  hard: { white: 0.4, blueWhite: 0.4, blue: 0.2 },
};
// Goal = drones DOWNED (not hits). With DRONE_HP 3 a drone now takes ~3 shots (30 s in the time model, flow.js), so hard 8 -> 6 to keep the
// hard total <= 16 min (flow.test.js); easy 5 / normal 6 still fit (easy <= 900 s, normal <= 17 min). Hard stays harder through its
// shorter drone fire gap and hotter shields (DRONE_FIRE_MS / DRONE_SHIELDS), not through a longer drone count.
export const M3_DRONE_GOAL = { easy: 5, normal: 6, hard: 6 };
// A drone has DRONE_HP hit points; a beam hit costs beamDamage(charge, shield) (1 at the same color, +1 per hotter step), so the
// conservative case (charge = the shield color) takes DRONE_HP shots. UNMEASURED: adjust after classroom play.
export const DRONE_HP = 3;
// m3 time model (flow.js m3SecPerDrone = M3_DRONE_FIND_SEC + DRONE_HP x M3_SEC_PER_SHOT). UNMEASURED: the old single 18 s per drone
// ("find a hot star, charge, aim, dodge, 1 shot") is split 12 s find+charge / 6 s per shot, so a 1-hit drone still costs 18 s.
export const M3_DRONE_FIND_SEC = 12;
export const M3_SEC_PER_SHOT = 6;
export const BOSS_ARMOR = {
  easy: ['yellow', 'yellowWhite', 'white'],
  normal: ['yellowWhite', 'white', 'blueWhite'],
  hard: ['yellowWhite', 'blueWhite', 'blue'], // 2026-11-07: stage 2 one step hotter and stage 3 blue (only blue pierces: 1 damage per hit)
};
// Boss hp per stage and difficulty under the damage rule (a hit = 1 + beam level - armor level). Armor-colored charge = 1 damage per hit
// (hits = hp), one step hotter = 2, ... (hits = ceil(hp / damage)). 2026-11-07: the old 4/5/6 let one blue shot fell stage 1 (blue 7 on
// yellowWhite 4 = 4 damage); now even a blue charge needs 3+ hits per stage on normal/hard:
//   normal [9, 8, 6] on yellowWhite / white / blueWhite: blue does 4 / 3 / 2 -> 3 / 3 / 3 hits; the armor's own color 9 / 8 / 6 hits.
//   hard [9, 7, 6] on yellowWhite / blueWhite / blue: blue does 4 / 2 / 1 -> 3 / 4 / 6 hits.
// Totals 23 (normal) and 22 (hard) armor-colored hits -> bossFightSec 198 s / 192 s of the 210 s limit (the conservative case; hotter charges are faster).
// Easy keeps [4, 5, 6] (15 hits = 150 s): the easy total is at 895 s of the 900 s cap (flow.test.js), so easy cannot get longer. UNMEASURED.
// Overflow damage never carries to the next stage (bossStageFromHp).
export const BOSS_HP = { easy: [4, 5, 6], normal: [9, 8, 6], hard: [9, 7, 6] };
// Boss time model (boss.js bossFightSec): per stage, seconds to find a piercing star, charge and line up, before the shots
// (M3_SEC_PER_SHOT each). 20 s x 3 + 15 shots x 6 s = 150 s, the same boss estimate flow.js used before damage existed. UNMEASURED.
export const BOSS_STAGE_FIND_SEC = 20;
// m4 charge-star pool (2026-11-07): like m3 big red/orange decoys (weight = repeats; red 3, orange 3 of 11) and hot stars rarer than
// "one of seven colors" (the old m4 drew all seven colors evenly, hot stars were easy to find). The needed-color guarantee
// (fillFormationColors with the current armor's piercing colors) still brings the required colour in, at the latest every SPAWN_NEEDED_GUARANTEE-th formation.
export const M4_STAR_POOL = ['red', 'red', 'red', 'orange', 'orange', 'orange', 'yellow', 'yellowWhite', 'white', 'blueWhite', 'blue'];
export const M3_STAR_POOL = ['red', 'red', 'red', 'orange', 'orange', 'orange', 'yellow', 'yellowWhite', 'white', 'blueWhite', 'blue']; // weight = repeats
export const M3_DECOY_SCALE = { min: 1.4, max: 1.8 }; // red / orange stars
export const M3_STAR_SCALE = { min: 0.55, max: 0.85 }; // the other stars
export const DRONE_WAVE_MS = { easy: 6000, normal: 5000, hard: 4000 }; // gap between drone waves (per difficulty; no spawnInterval scaling)
export const DRONE_MAX_ON_SCREEN = 3;
// m3 balance model only. UNMEASURED tuning knob: average fraction of the DRONE_MAX_ON_SCREEN slots alive and firing
// (drones get shot down, new waves come every DRONE_WAVE_MS). Tune after classroom play.
export const DRONE_ALIVE_DUTY = 0.6;
export const DRONE_FIRE_MS = { easy: 4000, normal: 2800, hard: 2000 };
export const DRONE_BAND_Y = { min: 380, max: 560 }; // hover rows
export const DRONE_SPEED_X = 90; // px/s patrol (fixed: the difficulty speed multiplier does not apply)
export const DRONE_MUZZLE_DY = 30; // drone bullets spawn this far below the drone centre
export const DRONE_MIN_SHOT_SPEED = 150; // a drone shot is skipped only if the safe-distance cap is below this

// m4 escort drones (2026-11-07): the m3 drone (shield by pickShieldColor, DRONE_HP, hp bar, droneShot) flies in from the SIDE (never through
// the boss hull) and patrols a row below the boss. Optional targets: not part of the goal; they vanish when the boss falls or flees.
// Max on screen by stage (stage 1 has none). Easy: one, only in stage 3 (easy is at its dodge cap); normal one; hard one then two.
export const BOSS_ESCORTS = { easy: { 1: 0, 2: 0, 3: 1 }, normal: { 1: 0, 2: 1, 3: 1 }, hard: { 1: 0, 2: 1, 3: 2 } };
// Hover rows: the boss hull bottom is BOSS_POS.y + BOSS_MUZZLE_DY = 524 and its shield ring reaches ~610, so a drone (radius ENEMY_BODY_R 34, hp bar
// ~55 px above its centre) at y >= 680 keeps body, ring and hp bar clear of both (smoke screenshot 2026-11-07: at 600 the hp bar touched the ring).
export const BOSS_ESCORT_BAND_Y = { min: 680, max: 740 };
export const BOSS_ESCORT_RESPAWN_MS = 8000; // a downed escort is replaced after this (UNMEASURED)
export const BOSS_ESCORT_FIRST_MS = 3000; // after a stage change the first escort arrives after this (UNMEASURED)
// Escorts shoot slower than the m3 drones (DRONE_FIRE_MS 4000/2800/2000): they are support for the boss, whose volleys already fill the screen. UNMEASURED.
export const BOSS_ESCORT_FIRE_MS = { easy: 5000, normal: 3800, hard: 3400 };

// Mission 4 boss ship (2026-11-04). The boss is not a star: it can be shot down. Armor color rises with stages (BOSS_ARMOR).
// BOSS_POS.y 430: the 300 px hull spans y 280..580, so everything below the HUD band (344) is visible and the muzzle
// (y 550) is far enough above the ship row (900) for canLaunch at every speed band (bullet speed is capped when the ship moves up).
export const BOSS_POS = { x: 360, y: 430 };
export const BOSS_SWAY = { amp: 160, periodMs: 6000 };
export const BOSS_HIT_FLASH_MS = 120;
export const BOSS_WIDTH_PX = 300; // on-screen hull width (the 80 px art is scaled up)
// Hull alpha bbox of public/img/boss.png (512x320 canvas, alpha >= 128), in texture px: Arcade rectangle body + muzzle.
export const BOSS_ART = { canvasW: 512, canvasH: 320, hull: { x: 6, y: 0, w: 500, h: 320 } };
export const BOSS_MUZZLE_DY = 94; // bullets start this far below the boss centre = hull bottom ((0+320-160) * 300/512)
export const BOSS_MIN_SHOT_SPEED = 150; // a volley is skipped if the safe-distance cap is below this (ship right under the muzzle)
