// Fixed-size object pools (Arcade groups). Everything is pre-warmed in create(), so
// play never creates or destroys a star, beam or asteroid — it acquires and releases.
//
//   const pools = createPools(scene);     // { stars, beams, asteroids, enemies, bullets }
//   const s = acquire(pools.stars);        // inactive member or null when the pool is full
//   release(s);                            // hide + disable body (+ its halo)
//
// Every star-pool member owns one halo image (`obj.halo`, glow-<colorKey>, additive)
// drawn just behind it; syncHalos(pools.stars) keeps it in place each frame.
// group.members is a plain array of the pre-warmed children so per-frame loops do
// not allocate (Group.getChildren() copies a Set into a new array every call).

import Phaser from 'phaser';
import {
  POOL_STARS, POOL_BEAMS, POOL_ASTEROIDS, POOL_ENEMIES, POOL_BULLETS, BEAM_BODY_W, BEAM_BODY_H,
  ENEMY_BODY_R, BULLET_BODY_R, HUD_BAND_BOTTOM, HP_BAR_H,
} from '../config/balance.js';
import { hpBarY } from '../logic/enemyHp.js';

export { HP_BAR_H }; // small enemy hp bar height (balance.js); width = the enemy's display width
import { STAR_TEX, STAR_CORE_R, ENEMY_TEX } from './starTextures.js';

function makePool(scene, { key, size, depth, setup }) {
  const group = scene.physics.add.group({
    classType: Phaser.Physics.Arcade.Image,
    maxSize: size,
    defaultKey: key,
    allowGravity: false,
  });
  group.members = [];
  for (let i = 0; i < size; i++) {
    const obj = group.create(-1000, -1000, key, undefined, false, false);
    obj.setDepth(depth);
    obj.body.setAllowGravity(false);
    setup?.(obj);
    obj.disableBody(true, true);
    group.members.push(obj);
  }
  return group;
}

export function createPools(scene) {
  const stars = makePool(scene, {
    key: 'star-white',
    size: POOL_STARS,
    depth: 10,
    setup: obj => {
      const off = STAR_TEX / 2 - STAR_CORE_R;
      obj.body.setCircle(STAR_CORE_R, off, off);
      obj.halo = scene.add
        .image(-1000, -1000, 'glow-white')
        .setDepth(9)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(false);
    },
  });
  const beams = makePool(scene, {
    key: 'beam',
    size: POOL_BEAMS,
    depth: 12,
    setup: obj => obj.body.setSize(BEAM_BODY_W, BEAM_BODY_H),
  });
  const asteroids = makePool(scene, {
    key: 'asteroid',
    size: POOL_ASTEROIDS,
    depth: 10,
    setup: obj => obj.body.setCircle(30, 6, 6),
  });
  // Enemies own a shield ring image (`obj.shield`, shield-<colorKey>) kept on top of them by syncShields.
  const enemies = makePool(scene, {
    key: 'drone',
    size: POOL_ENEMIES,
    depth: 11,
    setup: obj => {
      const off = ENEMY_TEX / 2 - ENEMY_BODY_R;
      obj.body.setCircle(ENEMY_BODY_R, off, off);
      obj.shield = scene.add.image(-1000, -1000, 'shield-white').setDepth(11.5).setVisible(false);
      // Small hp bar (drones): dark back + neutral white fill, shown only when spawnEnemy({ hpBar: true }).
      obj.hpBarBack = scene.add.rectangle(-1000, -1000, 10, 10, HP_BAR_BACK_COLOR, HP_BAR_BACK_ALPHA).setDepth(12).setVisible(false);
      obj.hpBar = scene.add.rectangle(-1000, -1000, 10, 10, HP_BAR_FILL_COLOR).setOrigin(0, 0.5).setDepth(12.1).setVisible(false);
      obj.hpBarState = { v: 1 }; // tweened 0..1 shown fraction (a separate target: hit flashes kill tweens of the enemy itself)
      obj.hpBarW = 0;
      obj.hpBarOffY = 0;
    },
  });
  const bullets = makePool(scene, {
    key: 'bullet',
    size: POOL_BULLETS,
    depth: 11,
    setup: obj => obj.body.setCircle(BULLET_BODY_R, 12 - BULLET_BODY_R, 12 - BULLET_BODY_R),
  });
  return { stars, beams, asteroids, enemies, bullets };
}

const HP_BAR_BACK_COLOR = 0x05070f;
const HP_BAR_BACK_ALPHA = 0.8;
const HP_BAR_FILL_COLOR = 0xffffff; // neutral: never a palette color

/** First inactive member, enabled at (x, y); null when every member is in use. */
export function acquire(group, x = 0, y = 0) {
  const obj = group.members.find(m => !m.active);
  if (!obj) return null;
  obj.enableBody(true, x, y, true, true);
  obj.setAlpha(1).setScale(1).setAngle(0).clearTint();
  obj.body.setVelocity(0, 0);
  obj.body.setAngularVelocity(0);
  return obj;
}

/** Return an object to its pool (kills its tweens; hides its halo). */
export function release(obj) {
  if (!obj || !obj.active) return;
  obj.scene?.tweens.killTweensOf(obj);
  obj.disableBody(true, true);
  if (obj.halo) {
    obj.scene?.tweens.killTweensOf(obj.halo);
    obj.halo.setVisible(false);
  }
  if (obj.shield) {
    obj.scene?.tweens.killTweensOf(obj.shield);
    obj.shield.setVisible(false);
  }
  if (obj.hpBar) {
    obj.scene?.tweens.killTweensOf(obj.hpBarState);
    obj.hpBar.setVisible(false);
    obj.hpBarBack.setVisible(false);
  }
}

/** Keep each active star's halo glued to it (call after physics has moved things). */
export function syncHalos(group) {
  for (const s of group.members) {
    if (s.active && s.halo.visible) s.halo.setPosition(s.x, s.y);
  }
}

/** Keep each active enemy's shield ring glued to it. */
export function syncShields(group) {
  for (const e of group.members) {
    if (e.active && e.shield.visible) e.shield.setPosition(e.x, e.y);
  }
}

/** Keep each visible hp bar glued above its enemy (no allocation). */
export function syncHpBars(group) {
  for (const e of group.members) {
    if (!e.active || !e.hpBar.visible) continue;
    const y = hpBarY(e.y, e.hpBarOffY, HP_BAR_H, HUD_BAND_BOTTOM);
    e.hpBarBack.setPosition(e.x, y);
    e.hpBar.setPosition(e.x - e.hpBarW / 2, y);
  }
}
