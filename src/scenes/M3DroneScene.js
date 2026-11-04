// Mission 3 — 방해 드론 격추. Shooting a star MEASURES it (never destroyed) and charges the beam with its color.
// Shielded drones patrol and shoot; only a charge at least as hot as the shield pierces it.
// Big, bright red/orange stars are decoys: size and brightness never change the charge — color decides.
import BaseMissionScene from './BaseMissionScene.js';
import { GAME_WIDTH } from '../config/game.js';
import { ENEMY_TEX } from '../objects/starTextures.js';
import {
  M3_DRONE_GOAL, M3_STAR_POOL, M3_DECOY_SCALE, M3_STAR_SCALE, DRONE_WAVE_MS, DRONE_MAX_ON_SCREEN,
  DRONE_FIRE_MS, DRONE_BAND_Y, DRONE_SPEED_X, BLOCKED_TOAST_MAX, WARMUP_MS,
} from '../config/balance.js';
import { speedFor, aimVelocity, createFormationMemo } from '../logic/speed.js';
import { fillFormationColors } from '../logic/spawner.js';
import { pickShieldColor } from '../logic/charge.js';
import { droneFormation, droneShot, neededChargeColors } from '../logic/drones.js';
import { createRank } from '../logic/rank.js';
import { MISSION_TEXT } from '../data/copy.js';

// Single place to wire the next mission.
const NEXT_AFTER_M3 = 'm4';

const FIRST_WAVE_MS = 3000;
const RETRY_WAVE_MS = 500;
const DRONE_ENTRY_Y = -40;
const DRONE_ENTRY_SPEED = 170; // px/s while flying in
const DRONE_MIN_X = 70;
const DRONE_MAX_X = GAME_WIDTH - 70;
const DECOY_KEYS = ['red', 'orange'];

const rand = (a, b) => a + Math.random() * (b - a);

export default class M3DroneScene extends BaseMissionScene {
  constructor() {
    super('m3');
    this.sunRef = true;
    this.showGauge = true; // HUD charge cell
  }

  buildPhases() {
    const key = this.diff.key;
    return [{
      id: 'm3', chargeMode: true, waves: true, blockedToast: false,
      remaining: s => M3_DRONE_GOAL[key] - s.downs,
    }];
  }

  setupMission() {
    this.downs = 0;
    this.droneElapsedMs = 0;
    this.waveInMs = FIRST_WAVE_MS;
    this.pendingDrones = []; // { x, delayMs }
    this.decoyTipShown = false;
    const restarts = this.registry.get('results')?.[this.missionId]?.restarts ?? 0;
    this.droneRank = createRank({ diffKey: this.diff.key, restarts });
  }

  onPhaseStart() {
    this.formSpeed = createFormationMemo();
    this.sinceNeeded = 0;
    this.formColors = null;
    this.formIndex = -1;
  }

  activeDrones() {
    return this.pools.enemies.members.filter(e => e.active && e.kind === 'drone');
  }

  /** One star per formation slot; colors drawn once per formation so a piercing color keeps coming. */
  spawnObject(_phase, slot) {
    if (!slot) return;
    if (slot.formationIndex !== this.formIndex) {
      this.formIndex = slot.formationIndex;
      const needed = neededChargeColors(this.activeDrones().map(d => d.shieldKey));
      const r = fillFormationColors({
        slotCount: slot.formationSize, needed, all: M3_STAR_POOL,
        sinceNeeded: this.sinceNeeded, rng: Math.random,
      });
      this.formColors = r.colors;
      this.sinceNeeded = r.sinceNeeded;
    }
    const colorKey = this.formColors[slot.slotIndex] ?? M3_STAR_POOL[Math.floor(Math.random() * M3_STAR_POOL.length)];
    const y = -60;
    const speed = this.formSpeed(slot.formationIndex, () => speedFor('target', this.diff.key, slot.tier)); // one per formation
    let vx = slot.vx;
    let vy = speed;
    if (slot.aim) ({ vx, vy } = aimVelocity({ x: slot.x, y }, { x: this.ship.x, y: this.ship.y }, speed));
    // Decoys (red/orange) are drawn big and bright; that never changes the charge they give.
    const decoy = DECOY_KEYS.includes(colorKey);
    this.spawnStar({
      x: slot.x, y, colorKey, vx, vy, zigzag: slot.aim ? null : slot.zigzag,
      scale: decoy ? rand(M3_DECOY_SCALE.min, M3_DECOY_SCALE.max) : rand(M3_STAR_SCALE.min, M3_STAR_SCALE.max),
      glow: decoy ? rand(0.9, 1) : rand(0.3, 0.5),
    });
  }

  onStarMeasured(obj) {
    if (this.decoyTipShown || !DECOY_KEYS.includes(obj.colorKey)) return;
    this.decoyTipShown = true;
    this.toast('크고 밝아도 적색·주황색이면 온도가 낮아요 → 약한 충전', { tone: 'info' });
  }

  onEnemyBlocked() {
    if (this.blockedHits <= BLOCKED_TOAST_MAX) {
      this.toast('빔이 약해요. 더 뜨거운 색의 별로 충전하세요.', { tone: 'info' });
    }
  }

  onEnemyDown() {
    this.downs += 1;
    this.droneRank.onCorrect();
    this.director?.onCorrect();
    this.refreshGoal();
  }

  // ---- drones (the engine does not steer enemies) ---------------------------------------
  onMissionUpdate(dt) {
    if (this.phaseDone || this.finished || !this.playing) return;
    this.droneElapsedMs += dt;
    this.droneRank.update(dt);
    this.updateWaves(dt);
    for (const d of this.activeDrones()) this.updateDrone(d, dt);
  }

  updateWaves(dt) {
    // staggered entries of an already planned wave
    for (const p of this.pendingDrones) p.delayMs -= dt;
    this.pendingDrones = this.pendingDrones.filter(p => {
      if (p.delayMs > 0) return true;
      this.spawnDrone(p.x);
      return false;
    });
    this.waveInMs -= dt;
    if (this.waveInMs > 0) return;
    const room = DRONE_MAX_ON_SCREEN - this.activeDrones().length - this.pendingDrones.length;
    if (room <= 0) {
      this.waveInMs = RETRY_WAVE_MS;
      return;
    }
    const count = Math.min(room, 1 + Math.floor(Math.random() * DRONE_MAX_ON_SCREEN));
    for (const d of droneFormation({ count, minX: DRONE_MIN_X, maxX: DRONE_MAX_X, rng: Math.random })) {
      this.pendingDrones.push({ x: d.x, delayMs: d.enterDelayMs });
    }
    this.waveInMs = DRONE_WAVE_MS[this.diff.key];
  }

  spawnDrone(x) {
    const e = this.spawnEnemy({
      x, y: DRONE_ENTRY_Y, vx: 0, vy: DRONE_ENTRY_SPEED, hp: 1,
      scale: ENEMY_TEX / this.textures.get('drone').getSourceImage().width, // loaded art (128) keeps the 80 px enemy footprint
      shieldKey: pickShieldColor(this.diff.key),
    });
    if (!e) return;
    e.hoverY = rand(DRONE_BAND_Y.min, DRONE_BAND_Y.max);
    e.dir = Math.random() < 0.5 ? -1 : 1;
    e.fireMs = DRONE_FIRE_MS[this.diff.key] * rand(0.6, 1);
  }

  updateDrone(d, dt) {
    if (d.y < d.hoverY) {
      d.body.setVelocity(0, DRONE_ENTRY_SPEED);
      return;
    }
    if (d.x <= DRONE_MIN_X) d.dir = 1;
    else if (d.x >= DRONE_MAX_X) d.dir = -1;
    d.body.setVelocity(d.dir * DRONE_SPEED_X, 0);
    d.fireMs -= dt;
    if (d.fireMs > 0) return;
    d.fireMs = DRONE_FIRE_MS[this.diff.key];
    const shot = droneShot({
      drone: { x: d.x, y: d.y }, ship: { x: this.ship.x, y: this.ship.y }, diffKey: this.diff.key,
      tier: this.droneRank.tier, aimAllowed: this.droneRank.aimAllowed, warmup: this.droneElapsedMs < WARMUP_MS,
    });
    if (shot) this.spawnBullet({ x: d.x, y: d.y + 30, vx: shot.vx, vy: shot.vy });
  }

  onPhaseComplete() {
    const next = this.scene.get(NEXT_AFTER_M3) ? NEXT_AFTER_M3 : 'title';
    this.completeMission({
      next: 'card',
      nextData: {
        title: '방해 드론 격퇴!',
        body: MISSION_TEXT.m3.card,
        ...(next === NEXT_AFTER_M3 && this.scene.get('briefing') ? { next: 'briefing', nextData: { mission: next } } : { next }),
      },
    });
  }
}
