/**
 * BaseMissionScene — shared engine for missions m1–m4.
 *
 * ── Subclass contract ──────────────────────────────────────────────────────────
 *   class M2GaugeScene extends BaseMissionScene {
 *     constructor() { super('m2'); this.sunRef = true; }   // scene key; missionId defaults to the key
 *     gaugePrefill() { return ['yellow']; }                // optional, default []
 *     buildPhases() { return [ {...phase}, ... ]; }        // REQUIRED, called from init() every run
 *     setupMission() {}                                     // optional: build fixed objects (cluster, constellation)
 *     spawnObject(phase) {}                                 // called on each Spawner tick of the current phase
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
 *   }
 * Judge target passed to phase.judge.judge(target) and wrongShotMessage:
 *   { id: obj.starId ?? null, name, colorKey, kind, obj }
 *
 * Optional hooks: onPhaseStart(phase), onMissionUpdate(dtMs, time), onLateUpdate() (after physics —
 * position labels here), onCorrectHit(obj, result, phase), onWrongHit(obj, result, phase),
 * onShipHit(obj, heat), practiceTone(obj) ('correct' | 'neutral', default 'correct': a practice hit
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
 * ── What the base does ─────────────────────────────────────────────────────────────
 *   ship + TouchControls + fire button; HeatMeter (cooling, dt-capped); pools; overlaps
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
 *   'muted' (HUD; mirrored into sfx.setMuted). gaugeFinal / orionTagged are written by the subclasses that own them.
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
  BEAM_SPEED,
  CULL_MARGIN,
  COLLISION_COOLDOWN_MS,
  MARK_FADE_MS,
  RESTART_DELAY_MS,
} from '../config/balance.js';
import { HeatMeter, heatOnCollision } from '../logic/heat.js';
import { StarGauge } from '../logic/gauge.js';
import { Spawner } from '../logic/spawner.js';
import { missionStars } from '../logic/scoring.js';
import { MISSION_TEXT, wrongShotMessage } from '../data/copy.js';
import { TouchControls, fireButtonRect, followFactor } from '../input/TouchControls.js';
import { hasImage, addBackdrop } from '../config/assets.js';
import { makeStarTextures, textureFor } from '../objects/starTextures.js';
import { createPools, acquire, release, syncHalos } from '../objects/Pools.js';
import { FONT } from '../objects/gaugeView.js';
import { sfx } from '../audio/sfx.js';

const FX_RINGS = 8;
const FX_POPS = 6; // pooled "+1" score texts
const FX_FLASHES = 4; // pooled red wrong-shot beam flashes
const SHAKE_MS = 120; // large tier: <= 150 ms, mission camera only
const SHAKE_INTENSITY = 0.006;

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
  spawnObject(_phase) {}
  onPhaseStart(_phase) {}
  onPhaseComplete(_phase) {
    if (!this.advancePhase()) this.completeMission();
  }
  onMissionUpdate(_dt, _time) {}
  onLateUpdate() {}
  onCorrectHit(_obj, _result, _phase) {}
  onWrongHit(_obj, _result, _phase) {}
  onShipHit(_obj, _heat) {}
  practiceTone(_obj) { return 'correct'; }

  // ---- lifecycle ------------------------------------------------------------------
  init(data) {
    this.initData = { ...(data ?? {}) };
    delete this.initData.restarted;
    this.isRestart = !!data?.restarted;

    this.phases = this.buildPhases();
    this.phaseIndex = -1;
    this.phase = null;
    this.phaseDone = false;
    this.phaseHits = 0;
    this.spawner = null;

    this.score = 0;
    this.wrongShots = 0;
    this.heat = new HeatMeter();
    this.gauge = new StarGauge(this.gaugePrefill());

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

    addBackdrop(this, this.backdropKey || 'bg-space', GAME_WIDTH, GAME_HEIGHT); // no-op until the image exists
    this.ship = this.physics.add.image(GAME_WIDTH / 2, SHIP_START_Y, 'ship').setDepth(20);
    this.ship.body.setAllowGravity(false);
    // The code ship is 64x76 (s = 1). A loaded 'ship' image of another size is scaled to the same footprint.
    const s = this.ship.width / 64;
    this.ship.setScale(1 / s);
    this.ship.body.setCircle(SHIP_BODY_RADIUS * s, this.ship.width / 2 - SHIP_BODY_RADIUS * s, 40 * s - SHIP_BODY_RADIUS * s);

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

    this.fireRect = fireButtonRect();
    this.createFireButton();
    this.controls = new TouchControls(this, { fireRect: this.fireRect });
    this.controls.on('fire', this.fire, this);

    // Overlaps: registered ONCE per run (the world and its colliders are torn down on shutdown).
    const { stars, beams, asteroids } = this.pools;
    this.physics.add.overlap(beams, stars, this.handleBeamHit, this.canBeamHit, this);
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

  onShutdown() {
    this.events.off('postupdate', this.lateUpdate, this);
    this.game.events.off('hud-ready', this.emitHudState, this);
  }

  update(time, delta) {
    const dt = Math.min(delta, MAX_DT_MS);
    this.controls.update();
    if (!this.playing) return;

    const c = this.controls;
    if (c.targetX !== null) {
      const k = followFactor(dt / 1000);
      this.ship.x += (c.targetX - this.ship.x) * k;
      this.ship.y += (c.targetY - this.ship.y) * k;
    }

    this.heat.update(dt);
    this.emitHeat();

    if (this.spawner && !this.phaseDone && this.spawner.update(dt)) this.spawnObject(this.phase);
    this.onMissionUpdate(dt, time);
    this.cull();
  }

  lateUpdate() {
    syncHalos(this.pools.stars);
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
    const interval = p.spawnIntervalMs ?? SPAWN_INTERVAL_MS[this.missionId] ?? 0;
    this.spawner = interval > 0 ? new Spawner({ intervalMs: interval }) : null;
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

  /** Stop play (no spawns, shots or collisions; ship + fire button hidden) but keep the scene. */
  endGameplay() {
    this.playing = false;
    this.spawner = null;
    this.controls.cancel();
    this.ship.setVisible(false);
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
   *   targetable (true), collides (true), persistent (false), keepOnMark (false), starId, name, depth.
   * @returns pooled object or null when the pool is exhausted.
   */
  spawnStar({
    x, y, colorKey, kind = 'star', scale = 1, glow = 0.6, vx = 0, vy = 200,
    targetable = true, collides = true, persistent = false, keepOnMark = false,
    starId = null, name = '', depth = 10,
  }) {
    const obj = acquire(this.pools.stars, x, y);
    if (!obj) return null;
    Object.assign(obj, {
      kind, colorKey, targetable, collides, persistent, keepOnMark, starId, name,
      marked: false, hitCooldownUntil: 0,
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

  spawnAsteroid({ x, y, vx = 0, vy = 260, scale = 1, spin = 60 }) {
    const obj = acquire(this.pools.asteroids, x, y);
    if (!obj) return null;
    Object.assign(obj, {
      kind: 'asteroid', colorKey: null, targetable: false, collides: true, persistent: false,
      keepOnMark: false, starId: null, name: '', marked: false, hitCooldownUntil: 0,
    });
    obj.setScale(scale);
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
    for (const b of this.pools.beams.members) if (b.active && b.y < -60) release(b);
  }

  // ---- shooting -------------------------------------------------------------------
  createFireButton() {
    const r = this.fireRect;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const g = this.add.graphics();
    g.fillStyle(0x7ef2d4, 0.18);
    g.fillCircle(0, 0, r.w / 2);
    g.lineStyle(5, 0x7ef2d4, 1);
    g.strokeCircle(0, 0, r.w / 2 - 3);
    const label = this.add
      .text(0, 0, '발사', { fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5);
    let parts = [g, label];
    if (hasImage(this, 'fire-button')) {
      g.destroy();
      parts = [this.add.image(0, 0, 'fire-button').setDisplaySize(r.w, r.w), label];
    }
    this.fireButton = this.add.container(cx, cy, parts).setDepth(30);
  }

  fire() {
    if (!this.playing) return;
    sfx.play('fire'); // small tier: sound only (+ the button press below)
    this.tweens.killTweensOf(this.fireButton);
    this.fireButton.setScale(0.9);
    this.tweens.add({ targets: this.fireButton, scale: 1, duration: 120 });
    const b = acquire(this.pools.beams, this.ship.x, this.ship.y - 44);
    if (!b) return;
    b.body.setVelocity(0, -BEAM_SPEED);
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
  markObject(obj, { neutral = false } = {}) {
    obj.marked = true;
    obj.targetable = false;
    this.tweens.killTweensOf(obj); // e.g. a collision blink
    obj.setAlpha(1);
    if (neutral) {
      sfx.play('mark');
    } else {
      sfx.play('correct');
      this.popScore(obj.x, obj.y - obj.displayHeight / 2);
    }
    const ring = this.fxRings.find(r => !r.visible);
    if (ring) {
      const s = (obj.displayWidth / 128) * 1.1;
      if (neutral) ring.setTint(0x9aa4b8);
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
    const heat = heatOnCollision(obj.kind, obj.colorKey);
    if (obj.persistent) obj.hitCooldownUntil = this.time.now + COLLISION_COOLDOWN_MS;
    else obj.collides = false; // a passing object hits once, then flies on
    this.tweens.add({ targets: obj, alpha: 0.3, duration: 90, yoyo: true, repeat: 2, onComplete: () => obj.setAlpha(1) });
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
}
