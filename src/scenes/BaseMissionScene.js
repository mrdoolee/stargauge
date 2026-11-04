/**
 * BaseMissionScene — shared engine for missions m1–m4.
 *
 * ── Subclass contract ──────────────────────────────────────────────────────────
 *   class M2GaugeScene extends BaseMissionScene {
 *     constructor() { super('m2'); this.sunRef = true; }   // scene key; missionId defaults to the key
 *     gaugePrefill() { return ['yellow']; }                // optional, default []
 *     buildPhases() { return [ {...phase}, ... ]; }        // REQUIRED, called from init() every run
 *     setupMission() {}                                     // optional: build fixed objects (fixed enemies, backdrops)
 *     spawnObject(phase, slot) {}                           // each Spawner tick of the phase (slot undefined), or each emitted
 *                                                           // WaveDirector slot when phase.waves (see below)
 *     onPhaseComplete(phase) {}                             // REQUIRED decision: advancePhase() / completeMission(...)
 *   }
 * Do NOT override create() or update(): use setupMission() and the per-frame hook onMissionUpdate(dtMs, time). If you override init(data), call super.init(data) first.
 * Fields: missionId ('m1'..'m4' — registry results key), sunRef (bool, default false),
 *         showGauge (bool, default true), toastAt ('top' | 'low', default 'top': where HUD toasts sit;
 *         m1 uses 'low' so toasts never cover the white zone just under the HUD).
 *
 * Phase object (plain; rebuilt every run so judge state like orderedJudge.progress resets):
 *   {
 *     id: 'm2a',                    // MISSION_TEXT key + wrongShotMessage phaseId
 *     judge: predicateJudge(...) | orderedJudge(...) | null,  // null = practice: hits just mark
 *     practice: true,               // optional marker for subclasses (e.g. m1 skips it on a restart)
 *     remaining: scene => number,   // optional; goal counter. <= 0 auto-completes the phase
 *     instruction: '...',           // optional override of MISSION_TEXT[id].instruction
 *     spawnIntervalMs: 900,         // optional; default SPAWN_INTERVAL_MS[missionId]; 0 = no spawner
 *     collisions: true,             // optional; false = ship passes through everything (m1 practice)
 *     fillGauge: true,              // optional; false = correct stars don't fill the gauge
 *     wrongMessage: (target, result) => string,  // optional override of wrongShotMessage
 *     waves: true,                  // optional; formation spawning via WaveDirector instead of a Spawner.
 *                                   // One director per run (rank + warm-up clock persist across waves phases),
 *                                   // created lazily with diff, registry results.<id>.restarts and
 *                                   // gapMs = scaleInterval(FORMATION_GAP_MS[missionId]). Not updated in phases without waves.
 *                                   // spawnObject(phase, slot) runs once per slot: slot = { delayMs, x, vx, aim,
 *                                   // zigzag: {amp, periodMs} | null, formationId, tier, aimAllowed,
   *                                   // formationIndex, formationSize, slotIndex }. Pass slot.zigzag to spawnStar/spawnAsteroid. A correct hit feeds director.onCorrect().
 *     waveBounds: { minX, maxX },   // optional; formation x range (default 70 .. GAME_WIDTH - 70)
 *     blockedToast: false,          // optional (chargeMode phases); false = no engine hint toast on a blocked hit (default: shown, first
 *                                   // BLOCKED_TOAST_MAX per run). this.blockedHits counts every blocked hit either way.
 *     chargeMode: true,             // optional; shooting a star MEASURES it: ring + fade (markObject, never destroyed) and
 *                                   // the beam is charged with its color (setCharge). No score, no wrong shot, no gauge fill,
 *                                   // judge ignored. Hook onStarMeasured(obj). Set showGauge true so the HUD shows the charge cell.
 *   }
 * Judge target passed to phase.judge.judge(target) and wrongShotMessage:
 *   { id: obj.starId ?? null, name, colorKey, kind, obj }
 *
 * Optional hooks: onPhaseStart(phase), onMissionUpdate(dtMs, time), onLateUpdate() (after physics —
 * position labels here), onCorrectHit(obj, result, phase), onWrongHit(obj, result, phase),
 * onShipHit(obj, heat), onStarMeasured(obj) (chargeMode), onEnemyDown(enemy) (hp hit 0, already released),
 * onEnemyPierced(enemy, res) (every pierce, hp already lowered, enemy still active; return true to KEEP it: then no
 * explosion, no release, no onEnemyDown, and the scene owns what follows, e.g. reset hp + setEnemyShield(next armor) + its fx),
 * onEnemyBlocked(enemy) (beam charge too weak for its shield; wrongShots and this.blockedHits already +1), practiceTone(obj) ('correct' | 'neutral', default 'correct': a practice hit
 * (judge null) on a 'neutral' object gets a soft mark — no "+1", no correct chime — and onCorrectHit
 * receives { correct: true, practice: true, neutral: true }).
 *
 * ── Objects (pooled Arcade images; plain fields, reset on every spawn) ────────────
 *   kind 'star'|'furnace'|'asteroid', colorKey, targetable (false ⇒ beams pass through),
 *   collides (false ⇒ ship passes through), persistent (never culled, re-hit after
 *   COLLISION_COOLDOWN_MS instead of once), keepOnMark (stays faded when marked instead of
 *   returning to the pool), starId, name, marked, halo (its glow image).
 *   Spawn with spawnStar({...}) / spawnAsteroid({...}); recolor with setObjectColor(obj, key);
 *   return with releaseObject(obj). Active members: this.pools.stars.members (filter .active).
 *   Asteroids are never targetable.
 *
 * ── Enemies, enemy bullets, charge (generic; used by m3/m4) ───────────────────────────
 *   this.charge: star colorKey the beam is charged with, or null (plain beam). setCharge(colorKey|null) re-tints newly
 *   fired beams with the exact palette hex and emits 'charge-changed' { colorKey } (HUD highlights that gauge cell).
 *   Reset to initialCharge() (null) in init() (so also on a heat restart).
 *   spawnEnemy({ x, y, vx=0, vy=0, shieldKey=null, hp=1, kind='drone', texture='drone', scale=1 }) -> enemy|null
 *     (pool POOL_ENEMIES; fields kind, shieldKey, hp, maxHp, colorKey null, collides, hitCooldownUntil; obj.shield = ring image
 *     shield-<shieldKey> kept over it). Not a star: a beam that pierces (resolveBeamOnEnemy: charge level >= shield level)
 *     costs 1 hp (an enemy with shieldKey null is always pierced); then onEnemyPierced(enemy, res); hp 0 (unless the hook kept it) =>
 *     explosion, releaseEnemy, onEnemyDown(enemy) (receives the ALREADY RELEASED enemy: inactive, shield hidden, x/y still readable).
 *     Setting enemy.collides = false disables the ship overlap for that enemy. Blocked => bounce spark + shield flash +
 *     wrongShots += 1 + onEnemyBlocked(enemy) (+ a short hint toast, at most BLOCKED_TOAST_MAX per run).
 *   releaseEnemy(enemy), setEnemyShield(enemy, shieldKey|null) (recolor / drop the shield).
 *   spawnBullet({ x, y, vx, vy }) -> bullet|null (pool POOL_BULLETS; never targetable by beams).
 *   Ship vs bullet: heat scaledHeat('asteroid', null, diff), bullet returned. Ship vs enemy body: same heat, enemy stays
 *   (COLLISION_COOLDOWN_MS between hits). Enemies/bullets are culled off screen like asteroids.
 *
 * ── What the base does ─────────────────────────────────────────────────────────────
 *   ship + TouchControls (virtual joystick bottom-left, fire button bottom-right, both semi-transparent
 *   at depth 30: above stars/ship/labels, below end-of-mission overlays (40) and the HUD scene). The ship
 *   moves at joystick vector x SHIP_MAX_SPEED inside this.shipBounds; its lowest y keeps the whole sprite
 *   above the controls (shipMaxY). HeatMeter (cooling, dt-capped); pools; overlaps
 *   registered once in create(); judging: correct ⇒ score, phaseHits, gauge fill (stars),
 *   mark (ring + fade, never destroyed); wrong ⇒ wrongShots, WRONG_SHOT_HEAT, toast with
 *   wrongShotMessage, beam consumed, object keeps flying. Collision heat =
 *   heatOnCollision(kind, colorKey) only. Heat full ⇒ registry results.<missionId>.restarts += 1
 *   and scene.restart({ ...initData, restarted: true }).
 *   Helpers: advancePhase(), completePhase(), endGameplay(), completeMission({ next, nextData }),
 *   refreshGoal(), toast(text, opts), setInstruction(text), emitGauge(), updateResult(patch).
 *
 * ── Registry ───────────────────────────────────────────────────────────────────────
 *   results.<missionId> = { stars, wrongShots, restarts }. Reset to zeros on a fresh start
 *   (data.restarted falsy); restarts accumulate across heat restarts; stars/wrongShots are
 *   written by completeMission() from the finishing attempt (wrongShots count per attempt).
 *   'muted' (HUD; mirrored into sfx.setMuted). gaugeFinal / measuredCounts are written by the subclasses that own them.
 *
 * ── HUD events (this.game.events) ── see HudScene.js for payloads.
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/game.js';
import {
  MAX_DT_MS,
  WRONG_SHOT_HEAT,
  SPAWN_INTERVAL_MS,
  SHIP_BODY_RADIUS,
  SHIP_START_Y,
  SHIP_BOUNDS,
  CONTROLS_ALPHA,
  CONTROLS_ACTIVE_ALPHA,
  BEAM_SPEED,
  BEAM_SPAWN_OFFSET_Y,
  CULL_MARGIN,
  COLLISION_COOLDOWN_MS,
  MARK_FADE_MS,
  RESTART_DELAY_MS,
  FORMATION_GAP_MS,
  BLOCKED_TOAST_MAX,
  ENEMY_BODY_R,
} from '../config/balance.js';
import { HeatMeter } from '../logic/heat.js';
import { getDifficulty, scaledHeat, scaleInterval } from '../logic/difficulty.js';
import { StarGauge } from '../logic/gauge.js';
import { zigzagVx } from '../logic/formations.js';
import { Spawner } from '../logic/spawner.js';
import { WaveDirector } from '../logic/waves.js';
import { initialCharge, resolveBeamOnEnemy, enemyHitOutcome } from '../logic/charge.js';
import { STAR_COLORS } from '../logic/temperature.js';
import { missionStars } from '../logic/scoring.js';
import { MISSION_TEXT, wrongShotMessage } from '../data/copy.js';
import { TouchControls, fireButtonRect, joystickLayout, shipMaxY, stepShip } from '../input/TouchControls.js';
import { hasImage, addBackdrop } from '../config/assets.js';
import {
  makeStarTextures, textureFor, loadedAsteroidKeys, ASTEROID_TEX, ENEMY_TEX, shieldTextureKey,
} from '../objects/starTextures.js';
import { createParallax, PARALLAX_SPACE } from '../objects/parallax.js';
import { createPools, acquire, release, syncHalos, syncShields } from '../objects/Pools.js';
import { FONT } from '../objects/gaugeView.js';
import { sfx } from '../audio/sfx.js';

// Backdrop dimming: stars must stay the brightest, most saturated things on screen.
const BACKDROP_DIM = { color: 0x05070f, alpha: 0.45 };
// Engine flames under the ship art's three nozzles (256x304 art -> 64x76; offsets from the ship's centre, in screen px).
const ENGINE_NOZZLES = [{ x: 0, y: 28, w: 7, h: 14 }, { x: -11, y: 23, w: 5, h: 10 }, { x: 11, y: 23, w: 5, h: 10 }];
const ENGINE_COLOR = 0x9ffff0;

const FX_RINGS = 8;
const FX_POPS = 6; // pooled "+1" score texts
const FX_FLASHES = 4; // pooled red wrong-shot beam flashes
const SHAKE_MS = 120; // large tier: <= 150 ms, mission camera only
const SHAKE_INTENSITY = 0.006;
const FX_BURSTS = 4; // pooled explosion / spark bursts: 1 ring + FX_BITS sparks each
const FX_BITS = 6;
const EXPLODE_MS = 280; // downed enemy burst (<= 300 ms)
const SPARK_MS = 160;
const SHIELD_ALPHA = 0.85;
const SHIELD_UNIT = 0.8; // shield ring scale per enemy scale unit (ring just outside the 80 px body)

export default class BaseMissionScene extends Phaser.Scene {
  constructor(key) {
    super(key);
    this.missionId = key;
    this.sunRef = false;
    this.showGauge = true;
    this.toastAt = 'top';
  }

  // ---- subclass hooks (defaults) --------------------------------------------------
  buildPhases() {
    throw new Error(`${this.constructor.name}.buildPhases() must return the mission phases`);
  }
  gaugePrefill() { return []; }
  setupMission() {}
  spawnObject(_phase, _slot) {}
  onPhaseStart(_phase) {}
  onPhaseComplete(_phase) {
    if (!this.advancePhase()) this.completeMission();
  }
  onMissionUpdate(_dt, _time) {}
  onLateUpdate() {}
  onCorrectHit(_obj, _result, _phase) {}
  onWrongHit(_obj, _result, _phase) {}
  onShipHit(_obj, _heat) {}
  onStarMeasured(_obj) {}
  onEnemyDown(_enemy) {}
  onEnemyPierced(_enemy, _res) { return false; }
  onEnemyBlocked(_enemy) {}
  practiceTone(_obj) { return 'correct'; }

  // ---- lifecycle ------------------------------------------------------------------
  init(data) {
    this.initData = { ...(data ?? {}) };
    delete this.initData.restarted;
    this.isRestart = !!data?.restarted;
    // Chosen on the title (registry 'difficulty', default normal); a mission restart keeps it.
    // Subclasses scale hazard speeds with scaleSpeed(v, this.diff.key) and intervals with this.diff.
    this.diff = getDifficulty(this.registry.get('difficulty'));

    this.phases = this.buildPhases();
    this.phaseIndex = -1;
    this.phase = null;
    this.phaseDone = false;
    this.phaseHits = 0;
    this.spawner = null;
    this.director = null; // WaveDirector, created lazily by the first `waves` phase

    this.score = 0;
    this.wrongShots = 0;
    this.heat = new HeatMeter();
    this.gauge = new StarGauge(this.gaugePrefill());
    this.charge = initialCharge();
    this.blockedHits = 0;

    this.playing = false;
    this.restarting = false;
    this.finished = false;
    this._lastHeatPct = -1;
    this._lastRemaining = undefined;

    if (!this.isRestart) this.updateResult({ stars: 0, wrongShots: 0, restarts: 0 }, true);
  }

  create() {
    makeStarTextures(this);
    this.pools = createPools(this);

    this.createBackground();
    this.ship = this.physics.add.image(GAME_WIDTH / 2, SHIP_START_Y, 'ship').setDepth(20);
    this.ship.body.setAllowGravity(false);
    // The code ship is 64x76 (s = 1). A loaded 'ship' image of another size is scaled to the same footprint.
    const s = this.ship.width / 64;
    this.ship.setScale(1 / s);
    this.ship.body.setCircle(SHIP_BODY_RADIUS * s, this.ship.width / 2 - SHIP_BODY_RADIUS * s, 40 * s - SHIP_BODY_RADIUS * s);

    // Controls layout first: the ship's lowest y is derived from it (whole sprite above the controls).
    this.joystickArea = joystickLayout();
    this.fireRect = fireButtonRect();
    const maxY = shipMaxY({ joystick: this.joystickArea, fireRect: this.fireRect, shipHalfHeight: this.ship.displayHeight / 2 });
    this.shipBounds = { ...SHIP_BOUNDS, maxY };
    this.ship.y = Math.min(SHIP_START_Y, maxY);
    this.createEngine();

    this.fxRings = [];
    for (let i = 0; i < FX_RINGS; i++) {
      this.fxRings.push(this.add.image(0, 0, 'fx-ring').setDepth(15).setVisible(false));
    }

    this.fxPops = [];
    for (let i = 0; i < FX_POPS; i++) {
      this.fxPops.push(this.add.text(0, 0, '+1', {
        fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#ffe98a', stroke: '#05070f', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(16).setVisible(false));
    }
    this.fxFlashes = [];
    for (let i = 0; i < FX_FLASHES; i++) {
      this.fxFlashes.push(this.add.image(0, 0, 'beam').setDepth(16).setVisible(false));
    }

    this.fxBursts = [];
    for (let i = 0; i < FX_BURSTS; i++) {
      const ring = this.add.image(0, 0, 'fx-ring').setDepth(16).setVisible(false);
      const bits = [];
      for (let k = 0; k < FX_BITS; k++) bits.push(this.add.image(0, 0, 'px').setDepth(16).setVisible(false));
      this.fxBursts.push({ ring, bits, busy: false });
    }

    this.createJoystick();
    this.createFireButton();
    this.controls = new TouchControls(this, { joystick: this.joystickArea, fireRect: this.fireRect });
    this.controls.on('fire', this.fire, this);
    this.controls.on('fire-state', this.setFirePressed, this);

    // Overlaps: registered ONCE per run (the world and its colliders are torn down on shutdown).
    const { stars, beams, asteroids, enemies, bullets } = this.pools;
    this.physics.add.overlap(beams, stars, this.handleBeamHit, this.canBeamHit, this);
    this.physics.add.overlap(beams, enemies, this.handleBeamEnemy, this.canBeamEnemy, this);
    this.physics.add.overlap(this.ship, enemies, this.handleEnemyBodyHit, this.canShipHit, this);
    this.physics.add.overlap(this.ship, bullets, this.handleBulletHit, this.canShipHit, this);
    this.physics.add.overlap(this.ship, stars, this.handleShipHit, this.canShipHit, this);
    this.physics.add.overlap(this.ship, asteroids, this.handleShipHit, this.canShipHit, this);

    this.events.on('postupdate', this.lateUpdate, this);
    this.game.events.on('hud-ready', this.emitHudState, this);
    this.events.once('shutdown', this.onShutdown, this);
    this.cameras.main.resetFX?.(); // a shake/flash from the previous run must not carry over

    this.ensureHud();
    this.playing = true;
    this.setupMission();
    this.startPhase(0);
    this.emitHudState();
  }

  /**
   * Mission backdrop, all below gameplay. `backdropKey` (set in a subclass constructor) = one static picture;
   * otherwise the two parallax space layers. Missing images are skipped (plain dark background).
   */
  createBackground() {
    this.parallax = null;
    let any = false;
    if (this.backdropKey) any = !!addBackdrop(this, this.backdropKey, GAME_WIDTH, GAME_HEIGHT, -10);
    else {
      this.parallax = createParallax(this, PARALLAX_SPACE);
      any = this.parallax.tiles.length > 0;
    }
    if (any) {
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, BACKDROP_DIM.color, BACKDROP_DIM.alpha).setDepth(-8);
    }
  }

  /** Engine flame(s) under the ship: the 'ship-engine' atlas (tag 'burn') when listed in assets, else a code flicker. */
  createEngine() {
    this.engine = [];
    if (hasImage(this, 'ship-engine')) {
      try {
        this.anims.createFromAseprite('ship-engine');
        const sp = this.add.sprite(0, 0, 'ship-engine').setDepth(19).setOrigin(0.5, 0);
        sp.play({ key: 'burn', repeat: -1 });
        this.engine.push({ obj: sp, dx: 0, dy: this.ship.displayHeight / 2 - 8, code: false });
        return;
      } catch (e) {
        console.warn('ship-engine atlas present but unusable; using code flame', e);
        this.engine.forEach(x => x.obj.destroy());
        this.engine = [];
      }
    }
    ENGINE_NOZZLES.forEach((n, i) => {
      const obj = this.add.ellipse(0, 0, n.w, n.h, ENGINE_COLOR, 0.8).setOrigin(0.5, 0).setDepth(19).setBlendMode(Phaser.BlendModes.ADD);
      this.engine.push({ obj, dx: n.x, dy: n.y, h: n.h, phase: i * 2.1, code: true });
    });
  }

  updateEngine(time) {
    for (const e of this.engine) {
      e.obj.setVisible(this.ship.visible);
      if (!this.ship.visible) continue;
      e.obj.setPosition(this.ship.x + e.dx, this.ship.y + e.dy);
      if (e.code) {
        const f = Math.sin(time * 0.03 + e.phase) * 0.5 + 0.5; // 0..1 flicker, ~5 Hz
        e.obj.setScale(0.8 + 0.3 * f, 0.7 + 0.5 * f).setAlpha(0.55 + 0.4 * f);
      }
    }
  }

  onShutdown() {
    this.events.off('postupdate', this.lateUpdate, this);
    this.game.events.off('hud-ready', this.emitHudState, this);
  }

  update(time, delta) {
    const dt = Math.min(delta, MAX_DT_MS);
    this.controls.update();
    this.syncJoystick();
    this.parallax?.update(dt);
    if (!this.playing) return;

    const v = this.controls.vector;
    if (v.x !== 0 || v.y !== 0) {
      const p = stepShip(this.ship, v, dt, { bounds: this.shipBounds });
      this.ship.setPosition(p.x, p.y);
    }

    this.heat.update(dt);
    this.emitHeat();

    if (this.spawner && !this.phaseDone && this.spawner.update(dt)) this.spawnObject(this.phase);
    if (this.director && this.phase?.waves && !this.phaseDone) {
      for (const slot of this.director.update(dt)) this.spawnObject(this.phase, slot);
    }
    this.updateZigzag(dt);
    this.onMissionUpdate(dt, time);
    this.cull();
  }

  /** Zigzag objects (spawned with `zigzag`) sway: vx = zigzagVx(baseVx, zigzag, age). Marked objects stay still. */
  updateZigzag(dt) {
    for (const group of [this.pools.stars, this.pools.asteroids]) {
      for (const o of group.members) {
        if (!o.active || !o.zigzag || o.marked) continue;
        o.zigAgeMs += dt;
        o.body.setVelocityX(zigzagVx(o.zigBaseVx, o.zigzag, o.zigAgeMs));
      }
    }
  }

  lateUpdate() {
    syncHalos(this.pools.stars);
    syncShields(this.pools.enemies);
    this.updateEngine(this.time.now);
    this.onLateUpdate();
  }

  // ---- HUD ------------------------------------------------------------------------
  ensureHud() {
    if (this.scene.isSleeping('hud')) this.scene.wake('hud');
    else if (!this.scene.isActive('hud')) this.scene.launch('hud');
    this.scene.bringToTop('hud');
  }

  emitHudState() {
    const ev = this.game.events;
    ev.emit('mission-start', { key: this.scene.key });
    ev.emit('sun-ref', !!this.sunRef);
    this.emitGauge();
    this._lastHeatPct = -1;
    this.emitHeat();
    this.game.events.emit('charge-changed', { colorKey: this.charge });
    this.setInstruction(this.currentInstruction());
    this._lastRemaining = undefined;
    this.emitGoal();
  }

  currentInstruction() {
    const p = this.phase;
    if (!p) return '';
    return p.instruction ?? MISSION_TEXT[p.id]?.instruction ?? '';
  }

  setInstruction(text) {
    this.game.events.emit('instruction', text);
  }

  emitGauge() {
    this.game.events.emit('gauge-changed', { filled: this.gauge.filledKeys(), visible: this.showGauge });
  }

  emitHeat() {
    const pct = Math.round(this.heat.ratio * 100);
    if (pct === this._lastHeatPct) return;
    this._lastHeatPct = pct;
    this.game.events.emit('heat-changed', { value: this.heat.value, max: this.heat.max, ratio: this.heat.ratio });
  }

  /** Emits 'goal-changed' if the remaining count changed; returns it (null = no counter). */
  emitGoal() {
    const p = this.phase;
    const remaining = p?.remaining ? Math.max(0, p.remaining(this)) : null;
    if (remaining !== this._lastRemaining) {
      this._lastRemaining = remaining;
      this.game.events.emit('goal-changed', { remaining });
    }
    return remaining;
  }

  /** Re-evaluate the goal; completes the phase when remaining reaches 0. */
  refreshGoal() {
    const remaining = this.emitGoal();
    if (remaining !== null && remaining <= 0) this.completePhase();
  }

  toast(text, opts = {}) {
    this.game.events.emit('toast', { text, at: this.toastAt, ...opts });
  }

  // ---- phases ---------------------------------------------------------------------
  startPhase(i) {
    this.phaseIndex = i;
    const p = (this.phase = this.phases[i]);
    this.phaseDone = false;
    this.phaseHits = 0;
    if (p.waves) {
      this.spawner = null;
      if (!this.director) {
        const restarts = this.registry.get('results')?.[this.missionId]?.restarts ?? 0;
        this.director = new WaveDirector({
          diffKey: this.diff.key,
          restarts,
          gapMs: scaleInterval(FORMATION_GAP_MS[this.missionId] ?? 0, this.diff.key),
          minX: p.waveBounds?.minX ?? 70,
          maxX: p.waveBounds?.maxX ?? GAME_WIDTH - 70,
        });
      }
    } else {
      const interval = scaleInterval(p.spawnIntervalMs ?? SPAWN_INTERVAL_MS[this.missionId] ?? 0, this.diff.key); // 0 stays 0
      this.spawner = interval > 0 ? new Spawner({ intervalMs: interval }) : null;
    }
    this.setInstruction(this.currentInstruction());
    this.onPhaseStart(p);
    this.refreshGoal();
  }

  completePhase() {
    if (this.phaseDone || this.restarting || this.finished || !this.phase) return;
    this.phaseDone = true;
    this.spawner = null;
    this.onPhaseComplete(this.phase);
  }

  /** Start the next phase; false when there is none. */
  advancePhase() {
    if (this.phaseIndex + 1 >= this.phases.length) return false;
    this.startPhase(this.phaseIndex + 1);
    return true;
  }

  /** Stop play (no spawns, shots or collisions; ship + joystick + fire button hidden) but keep the scene. */
  endGameplay() {
    this.playing = false;
    this.spawner = null;
    this.controls.cancel();
    this.ship.setVisible(false);
    this.joystickView.setVisible(false);
    this.fireButton.setVisible(false);
  }

  /** Write results, sleep the HUD and start `next` (if given). Returns the 1–3 star rating. */
  completeMission({ next, nextData } = {}) {
    if (this.finished) return null;
    this.finished = true;
    this.playing = false;
    this.controls.cancel();
    const restarts = this.registry.get('results')?.[this.missionId]?.restarts ?? 0;
    const stars = missionStars({ wrongShots: this.wrongShots, restarts });
    this.updateResult({ stars, wrongShots: this.wrongShots, restarts });
    sfx.play('clear');
    this.game.events.emit('mission-end', { key: this.scene.key });
    this.scene.sleep('hud');
    if (next) this.scene.start(next, nextData);
    return stars;
  }

  updateResult(patch, replace = false) {
    const all = { ...(this.registry.get('results') ?? {}) };
    const prev = replace ? {} : all[this.missionId] ?? { stars: 0, wrongShots: 0, restarts: 0 };
    all[this.missionId] = { ...prev, ...patch };
    this.registry.set('results', all);
  }

  // ---- spawning -------------------------------------------------------------------
  /**
   * @param {object} o
   *   x, y, colorKey (required); kind 'star'|'furnace' (default 'star'); scale (size, default 1);
   *   glow 0..1 (halo brightness, default 0.6); vx, vy (px/s, default 0, 200);
   *   targetable (true), collides (true), persistent (false), keepOnMark (false), starId, name, depth,
   *   zigzag ({ amp, periodMs } | null, default null: the base sways vx around `vx`, see zigzagVx).
   * @returns pooled object or null when the pool is exhausted.
   */
  spawnStar({
    x, y, colorKey, kind = 'star', scale = 1, glow = 0.6, vx = 0, vy = 200,
    targetable = true, collides = true, persistent = false, keepOnMark = false,
    starId = null, name = '', depth = 10, zigzag = null,
  }) {
    const obj = acquire(this.pools.stars, x, y);
    if (!obj) return null;
    Object.assign(obj, {
      kind, colorKey, targetable, collides, persistent, keepOnMark, starId, name,
      marked: false, hitCooldownUntil: 0, zigzag, zigBaseVx: vx, zigAgeMs: 0,
    });
    obj.setTexture(textureFor(kind, colorKey)).setScale(scale).setDepth(depth);
    obj.body.setVelocity(vx, vy);
    obj.halo
      .setTexture(`glow-${colorKey}`)
      .setPosition(x, y)
      .setScale(scale * (0.5 + glow * 0.45)) // halo <= ~1.8x the core rim at glow 1
      .setAlpha(0.35 + glow * 0.55)
      .setDepth(depth - 1)
      .setVisible(glow > 0);
    return obj;
  }

  spawnAsteroid({ x, y, vx = 0, vy = 260, scale = 1, spin = 60, zigzag = null }) {
    const obj = acquire(this.pools.asteroids, x, y);
    if (!obj) return null;
    Object.assign(obj, {
      kind: 'asteroid', colorKey: null, targetable: false, collides: true, persistent: false,
      keepOnMark: false, starId: null, name: '', marked: false, hitCooldownUntil: 0,
      zigzag, zigBaseVx: vx, zigAgeMs: 0,
    });
    // Generated art (128 px) is shown at the old 72 px footprint with the same hitbox (circle r 30 at the centre).
    const keys = loadedAsteroidKeys(this);
    if (keys.length) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      obj.setTexture(key);
      const k = ASTEROID_TEX / obj.width;
      obj.setScale(scale * k);
      const r = 30 / k;
      obj.body.setCircle(r, obj.width / 2 - r, obj.height / 2 - r);
    } else {
      obj.setTexture('asteroid');
      obj.setScale(scale);
      obj.body.setCircle(30, 6, 6);
    }
    obj.body.setVelocity(vx, vy);
    obj.body.setAngularVelocity(spin);
    return obj;
  }

  /** Change an object's color (e.g. a cooling furnace blob); texture follows the key. */
  setObjectColor(obj, colorKey) {
    if (obj.colorKey === colorKey) return;
    obj.colorKey = colorKey;
    obj.setTexture(textureFor(obj.kind, colorKey));
    obj.halo?.setTexture(`glow-${colorKey}`);
  }

  releaseObject(obj) {
    release(obj);
  }

  cull() {
    const out = o => o.y > GAME_HEIGHT + CULL_MARGIN || o.y < -6 * CULL_MARGIN
      || o.x < -CULL_MARGIN || o.x > GAME_WIDTH + CULL_MARGIN;
    for (const s of this.pools.stars.members) if (s.active && !s.persistent && out(s)) release(s);
    for (const a of this.pools.asteroids.members) if (a.active && out(a)) release(a);
    for (const e of this.pools.enemies.members) if (e.active && out(e)) release(e);
    for (const b of this.pools.bullets.members) if (b.active && out(b)) release(b);
    for (const b of this.pools.beams.members) if (b.active && b.y < -60) release(b);
  }

  // ---- controls (drawn once; only the knob position and alphas change) ---------------
  /** Semi-transparent ring + knob, bottom-left. Not a physics object: stars/blobs pass behind it. */
  createJoystick() {
    const j = this.joystickArea;
    const ring = this.add.graphics();
    ring.fillStyle(0x7ef2d4, 0.14);
    ring.fillCircle(0, 0, j.radius);
    ring.lineStyle(5, 0x7ef2d4, 1);
    ring.strokeCircle(0, 0, j.radius - 3);
    const knobR = Math.round(j.radius * 0.42);
    this.joystickKnob = this.add.graphics();
    this.joystickKnob.fillStyle(0x7ef2d4, 0.6);
    this.joystickKnob.fillCircle(0, 0, knobR);
    this.joystickKnob.lineStyle(4, 0xffffff, 0.9);
    this.joystickKnob.strokeCircle(0, 0, knobR - 2);
    this.joystickView = this.add.container(j.cx, j.cy, [ring, this.joystickKnob]).setDepth(30).setAlpha(CONTROLS_ALPHA);
    this._knobX = 0;
    this._knobY = 0;
    this._stickActive = false;
  }

  /** Knob follows the thumb (clamped to the ring) and recentres on release; brighter while held. */
  syncJoystick() {
    const c = this.controls;
    if (c.knob.x !== this._knobX || c.knob.y !== this._knobY) {
      this._knobX = c.knob.x;
      this._knobY = c.knob.y;
      this.joystickKnob.setPosition(this._knobX, this._knobY);
    }
    if (c.isSteering !== this._stickActive) {
      this._stickActive = c.isSteering;
      this.joystickView.setAlpha(this._stickActive ? CONTROLS_ACTIVE_ALPHA : CONTROLS_ALPHA);
    }
  }

  createFireButton() {
    const r = this.fireRect;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const g = this.add.graphics();
    g.fillStyle(0x7ef2d4, 0.18);
    g.fillCircle(0, 0, r.w / 2);
    g.lineStyle(5, 0x7ef2d4, 1);
    g.strokeCircle(0, 0, r.w / 2 - 3);
    // Pressed state: an inner glow shown while a finger is on the button.
    this.firePressedGlow = this.add.graphics().setVisible(false);
    this.firePressedGlow.fillStyle(0x7ef2d4, 0.45);
    this.firePressedGlow.fillCircle(0, 0, r.w / 2 - 6);
    const label = this.add
      .text(0, 0, '발사', { fontFamily: FONT, fontSize: '38px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5);
    let parts = [g, this.firePressedGlow, label];
    if (hasImage(this, 'fire-button')) {
      g.destroy();
      parts = [this.add.image(0, 0, 'fire-button').setDisplaySize(r.w, r.w), this.firePressedGlow, label];
    }
    this.fireButton = this.add.container(cx, cy, parts).setDepth(30).setAlpha(CONTROLS_ALPHA);
  }

  setFirePressed(pressed) {
    this.firePressedGlow.setVisible(pressed);
    this.fireButton.setAlpha(pressed ? CONTROLS_ACTIVE_ALPHA : CONTROLS_ALPHA);
  }

  // ---- shooting -------------------------------------------------------------------

  fire() {
    if (!this.playing) return;
    sfx.play('fire'); // small tier: sound only (+ the button press below)
    this.tweens.killTweensOf(this.fireButton);
    this.fireButton.setScale(0.9);
    this.tweens.add({ targets: this.fireButton, scale: 1, duration: 120 });
    const b = acquire(this.pools.beams, this.ship.x, this.ship.y - BEAM_SPAWN_OFFSET_Y);
    if (!b) return;
    b.body.setVelocity(0, -BEAM_SPEED);
    const hex = this.chargeHex();
    if (hex !== null) b.setTint(hex); // charged: the beam core is exactly the palette color
  }

  /** Palette hex of the current charge, or null (no charge = the plain beam). */
  chargeHex() {
    if (!this.charge) return null;
    return STAR_COLORS.find(c => c.key === this.charge)?.hex ?? null;
  }

  /** Charge the beam with a star color (null clears). Newly fired beams take the color; the HUD highlights the cell. */
  setCharge(colorKey) {
    this.charge = colorKey ?? null;
    this.game.events.emit('charge-changed', { colorKey: this.charge });
  }

  targetOf(obj) {
    return { id: obj.starId ?? null, name: obj.name, colorKey: obj.colorKey, kind: obj.kind, obj };
  }

  canBeamHit(beam, obj) {
    return this.playing && beam.active && obj.active && obj.targetable && !obj.marked;
  }

  handleBeamHit(beam, obj) {
    if (!beam.active) return;
    const bx = beam.x;
    const by = beam.y;
    release(beam);
    const phase = this.phase;
    if (!phase || this.phaseDone || this.restarting) return;

    if (phase.chargeMode) {
      // Measuring: ring + fade (never destroyed), the beam takes the star's color. No score, no wrong shot, no gauge.
      const hex = STAR_COLORS.find(c => c.key === obj.colorKey)?.hex;
      this.markObject(obj, { pop: false, ringHex: hex });
      if (hex !== undefined) this.setCharge(obj.colorKey);
      this.onStarMeasured(obj);
      this.refreshGoal();
      return;
    }

    if (!phase.judge) {
      const neutral = this.practiceTone(obj) === 'neutral';
      this.markObject(obj, { neutral });
      this.onCorrectHit(obj, { correct: true, practice: true, neutral }, phase);
      this.refreshGoal();
      return;
    }

    const target = this.targetOf(obj);
    const result = phase.judge.judge(target);
    if (result.correct) {
      this.score += 1;
      this.phaseHits += 1;
      if (obj.kind === 'star' && phase.fillGauge !== false && this.gauge.fill(obj.colorKey)) this.emitGauge();
      this.director?.onCorrect();
      this.markObject(obj);
      this.onCorrectHit(obj, result, phase);
    } else {
      this.wrongShots += 1;
      const text = phase.wrongMessage?.(target, result) ?? wrongShotMessage(phase.id, target);
      const ladder = obj.kind === 'furnace' ? 'furnace' : obj.kind === 'star' ? 'star' : null;
      this.toast(text, { colorKey: obj.colorKey, ladder, tone: 'wrong' });
      this.flashWrongBeam(bx, by);
      sfx.play('wrong');
      this.onWrongHit(obj, result, phase);
      this.addHeat(WRONG_SHOT_HEAT);
    }
    this.refreshGoal();
  }

  /**
   * Correct-star mark: ring burst, then fade (kept) or fade + return to the pool. Never "destroyed".
   * neutral (practice only): soft sound, grey ring, no "+1" — the hit is acknowledged, not praised.
   */
  markObject(obj, { neutral = false, pop = true, ringHex = null } = {}) {
    obj.marked = true;
    obj.targetable = false;
    this.tweens.killTweensOf(obj); // e.g. a collision blink
    obj.setAlpha(1);
    if (neutral) {
      sfx.play('mark');
    } else {
      sfx.play('correct');
      if (pop) this.popScore(obj.x, obj.y - obj.displayHeight / 2);
    }
    const ring = this.fxRings.find(r => !r.visible);
    if (ring) {
      const s = (obj.displayWidth / 128) * 1.1;
      if (neutral) ring.setTint(0x9aa4b8);
      else if (ringHex !== null) ring.setTint(ringHex);
      else ring.clearTint();
      ring.setPosition(obj.x, obj.y).setScale(s).setAlpha(1).setVisible(true);
      this.tweens.add({
        targets: ring, scale: s * 1.8, alpha: 0, duration: MARK_FADE_MS,
        onComplete: () => ring.setVisible(false),
      });
    }
    if (obj.keepOnMark) {
      this.tweens.add({ targets: obj, alpha: 0.35, duration: MARK_FADE_MS });
      if (obj.halo) this.tweens.add({ targets: obj.halo, alpha: obj.halo.alpha * 0.35, duration: MARK_FADE_MS });
      return;
    }
    obj.body.setVelocity(0, 0);
    this.tweens.add({
      targets: [obj, obj.halo].filter(Boolean),
      alpha: 0,
      duration: MARK_FADE_MS,
      onComplete: () => release(obj),
    });
  }

  /** Medium tier (correct): "+1" pops up and drifts away. Pooled; no stray tweens. */
  popScore(x, y) {
    const t = this.fxPops.find(p => !p.visible);
    if (!t) return;
    this.tweens.killTweensOf(t);
    const px = Phaser.Math.Clamp(x, 40, GAME_WIDTH - 40);
    t.setPosition(px, y).setAlpha(1).setScale(0.6).setVisible(true);
    this.tweens.add({ targets: t, scale: 1.15, duration: 110, ease: 'Back.Out' });
    this.tweens.add({
      targets: t, y: y - 56, alpha: 0, duration: 520, delay: 60,
      onComplete: () => t.setVisible(false),
    });
  }

  /** Medium tier (wrong): the consumed beam flashes red where it hit. Pooled. */
  flashWrongBeam(x, y) {
    const f = this.fxFlashes.find(p => !p.visible);
    if (!f) return;
    this.tweens.killTweensOf(f);
    f.setPosition(x, y).setTint(0xff3b30).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: f, alpha: 0, scaleX: 1.8, duration: 200,
      onComplete: () => { f.setVisible(false).clearTint().setScale(1); },
    });
  }

  // ---- collisions / heat ----------------------------------------------------------
  canShipHit(_ship, obj) {
    return this.playing && this.phase?.collisions !== false && obj.active && obj.collides
      && !obj.marked && this.time.now >= obj.hitCooldownUntil;
  }

  handleShipHit(_ship, obj) {
    const heat = scaledHeat(obj.kind, obj.colorKey, this.diff.key); // ship collisions only: wrong-shot heat is not scaled
    if (obj.persistent) obj.hitCooldownUntil = this.time.now + COLLISION_COOLDOWN_MS;
    else obj.collides = false; // a passing object hits once, then flies on
    this.shipHitFeedback(obj, heat, true);
  }

  /** Ship-hit feedback shared by stars/asteroids/enemies/bullets: optional blink of `obj`, ship tint, thud, shake, heat. */
  shipHitFeedback(obj, heat, blink) {
    if (blink) this.tweens.add({ targets: obj, alpha: 0.3, duration: 90, yoyo: true, repeat: 2, onComplete: () => obj.setAlpha(1) });
    this.ship.setTint(0xff7a5c);
    this.time.delayedCall(160, () => this.ship.clearTint());
    // Large tier: short camera shake (mission camera only, input untouched) + heat bar flash + thud.
    sfx.play('hit');
    this.cameras.main.shake(SHAKE_MS, SHAKE_INTENSITY);
    this.game.events.emit('ship-hit', { heat });
    this.onShipHit(obj, heat);
    this.addHeat(heat);
  }

  addHeat(n) {
    if (this.restarting || this.finished) return;
    this.heat.add(n);
    this.emitHeat();
    if (this.heat.isFull()) this.overheat();
  }

  overheat() {
    if (this.restarting) return;
    this.restarting = true;
    this.playing = false;
    this.controls.cancel();
    this.physics.pause();
    const restarts = (this.registry.get('results')?.[this.missionId]?.restarts ?? 0) + 1;
    this.updateResult({ restarts });
    this.toast('선체 온도가 가득 찼어요! 이 미션을 처음부터 다시 해요.', { tone: 'alert' });
    this.cameras.main.flash(RESTART_DELAY_MS - 100, 255, 90, 40);
    this.time.delayedCall(RESTART_DELAY_MS, () => this.scene.restart({ ...this.initData, restarted: true }));
  }

  // ---- enemies / bullets / beam vs enemy --------------------------------------------
  spawnEnemy({ x, y, vx = 0, vy = 0, shieldKey = null, hp = 1, kind = 'drone', texture = 'drone', scale = 1 }) {
    const obj = acquire(this.pools.enemies, x, y);
    if (!obj) return null;
    Object.assign(obj, {
      kind, colorKey: null, targetable: false, collides: true, persistent: false, keepOnMark: false,
      starId: null, name: '', marked: false, hitCooldownUntil: 0, zigzag: null, hp, maxHp: hp, shieldKey: null,
    });
    obj.setTexture(texture).setScale(scale);
    const r = ENEMY_BODY_R * (obj.width / ENEMY_TEX); // hitbox follows the art size (a loaded image of another size keeps the footprint)
    obj.body.setCircle(r, obj.width / 2 - r, obj.height / 2 - r);
    obj.body.setVelocity(vx, vy);
    this.setEnemyShield(obj, shieldKey);
    return obj;
  }

  releaseEnemy(obj) {
    release(obj);
  }

  /** Recolor (or, with null, remove) an enemy's shield ring. */
  setEnemyShield(obj, shieldKey) {
    obj.shieldKey = shieldKey ?? null;
    const sh = obj.shield;
    if (!sh) return;
    this.tweens.killTweensOf(sh);
    if (!obj.shieldKey) {
      sh.setVisible(false);
      return;
    }
    obj.shieldScale = SHIELD_UNIT * obj.scaleX * (obj.width / ENEMY_TEX);
    sh.setTexture(shieldTextureKey(obj.shieldKey)).setPosition(obj.x, obj.y).setScale(obj.shieldScale)
      .setAlpha(SHIELD_ALPHA).setVisible(true);
  }

  spawnBullet({ x, y, vx = 0, vy = 0 }) {
    const obj = acquire(this.pools.bullets, x, y);
    if (!obj) return null;
    Object.assign(obj, { kind: 'bullet', colorKey: null, targetable: false, collides: true, marked: false, hitCooldownUntil: 0 });
    obj.body.setVelocity(vx, vy);
    return obj;
  }

  canBeamEnemy(beam, enemy) {
    return this.playing && beam.active && enemy.active;
  }

  handleBeamEnemy(beam, enemy) {
    if (!beam.active) return;
    const bx = beam.x;
    const by = beam.y;
    release(beam);
    const phase = this.phase;
    if (!phase || this.phaseDone || this.restarting) return;
    const res = resolveBeamOnEnemy({ charge: this.charge, shieldKey: enemy.shieldKey, hp: enemy.hp });
    if (res.pierced) {
      enemy.hp = res.hp;
      const keep = this.onEnemyPierced(enemy, res) === true;
      const outcome = enemyHitOutcome({ res, keepAlive: keep });
      if (outcome === 'kept') {
        this.sparkAt(bx, by, this.chargeHex() ?? 0xffffff);
        sfx.play('correct');
      } else if (outcome === 'down') {
        this.explodeAt(enemy.x, enemy.y, enemy.displayWidth / ENEMY_TEX, this.chargeHex() ?? 0xffffff);
        sfx.play('clear');
        this.releaseEnemy(enemy);
        this.onEnemyDown(enemy);
      } else {
        this.sparkAt(bx, by, this.chargeHex() ?? 0xffffff);
        sfx.play('correct');
        this.tweens.killTweensOf(enemy);
        enemy.setAlpha(1);
        this.tweens.add({ targets: enemy, alpha: 0.4, duration: 60, yoyo: true, onComplete: () => enemy.setAlpha(1) });
      }
    } else {
      this.wrongShots += 1;
      this.blockedHits += 1;
      this.sparkAt(bx, by, 0xffffff);
      this.flashShield(enemy);
      sfx.play('wrong');
      if (phase.blockedToast !== false && this.blockedHits <= BLOCKED_TOAST_MAX) {
        this.toast(this.charge
          ? '방어막을 뚫기엔 빔이 약해요. 더 뜨거운(푸른쪽) 별을 맞혀 충전해요!'
          : '먼저 별을 맞혀 빔을 충전해요!', { tone: 'wrong' });
      }
      this.onEnemyBlocked(enemy);
    }
    this.refreshGoal();
  }

  /** Blocked hit: the shield ring pops bigger and bright for a moment (colour untouched). */
  flashShield(enemy) {
    const sh = enemy.shield;
    if (!sh || !sh.visible) return;
    this.tweens.killTweensOf(sh);
    const base = enemy.shieldScale;
    sh.setAlpha(1).setScale(base * 1.25);
    this.tweens.add({ targets: sh, scale: base, alpha: SHIELD_ALPHA, duration: 160 });
  }

  handleEnemyBodyHit(_ship, enemy) {
    enemy.hitCooldownUntil = this.time.now + COLLISION_COOLDOWN_MS;
    this.shipHitFeedback(enemy, scaledHeat('asteroid', null, this.diff.key), false);
  }

  handleBulletHit(_ship, bullet) {
    release(bullet);
    this.shipHitFeedback(bullet, scaledHeat('asteroid', null, this.diff.key), false);
  }

  /** Code-only fx from a pooled burst: a ring + sparks flying out over `ms`. size ~ 1 = a drone. */
  burst(x, y, size, hex, ms, nBits) {
    const b = this.fxBursts.find(f => !f.busy);
    if (!b) return;
    b.busy = true;
    const R = 60 * size;
    b.ring.setPosition(x, y).setScale(0.15 * size).setAlpha(1).setTint(hex).setVisible(true);
    this.tweens.add({
      targets: b.ring, scale: (R / 58) * 1.6, alpha: 0, duration: ms,
      onComplete: () => { b.ring.setVisible(false); b.busy = false; },
    });
    for (let k = 0; k < FX_BITS; k++) {
      const bit = b.bits[k];
      if (k >= nBits) { bit.setVisible(false); continue; }
      const a = (k / nBits) * Math.PI * 2 + x * 0.01;
      bit.setPosition(x, y).setScale(1.5 + size).setAlpha(1).setTint(k % 2 ? hex : 0xffffff).setVisible(true);
      this.tweens.add({
        targets: bit, x: x + Math.cos(a) * R, y: y + Math.sin(a) * R, alpha: 0, duration: ms,
        onComplete: () => bit.setVisible(false),
      });
    }
  }

  explodeAt(x, y, size = 1, hex = 0xffffff) {
    this.burst(x, y, Math.max(0.6, size), hex, EXPLODE_MS, FX_BITS);
  }

  sparkAt(x, y, hex = 0xffffff) {
    this.burst(x, y, 0.5, hex, SPARK_MS, 3);
  }
}
