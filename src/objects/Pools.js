// Fixed-size object pools (Arcade groups). Everything is pre-warmed in create(), so
// play never creates or destroys a star, beam or asteroid — it acquires and releases.
//
//   const pools = createPools(scene);     // { stars, beams, asteroids }
//   const s = acquire(pools.stars);        // inactive member or null when the pool is full
//   release(s);                            // hide + disable body (+ its halo)
//
// Every star-pool member owns one halo image (`obj.halo`, glow-<colorKey>, additive)
// drawn just behind it; syncHalos(pools.stars) keeps it in place each frame.
// group.members is a plain array of the pre-warmed children so per-frame loops do
// not allocate (Group.getChildren() copies a Set into a new array every call).

import Phaser from 'phaser';
import { POOL_STARS, POOL_BEAMS, POOL_ASTEROIDS, BEAM_BODY_W, BEAM_BODY_H } from '../config/balance.js';
import { STAR_TEX, STAR_CORE_R } from './starTextures.js';

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
  return { stars, beams, asteroids };
}

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
}

/** Keep each active star's halo glued to it (call after physics has moved things). */
export function syncHalos(group) {
  for (const s of group.members) {
    if (s.active && s.halo.visible) s.halo.setPosition(s.x, s.y);
  }
}
