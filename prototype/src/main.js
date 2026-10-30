import Phaser from 'phaser';

const W = 720, H = 1280;
// name, color, collision heat, hotter than sun?
const STARS = [
  { c: 0x3d7bff, heat: 30, hot: true },
  { c: 0x9cc9ff, heat: 25, hot: true },
  { c: 0xf4f6ff, heat: 20, hot: true },
  { c: 0xfff1b8, heat: 16, hot: true },
  { c: 0xffd23f, heat: 12, hot: false },
  { c: 0xff9a2e, heat: 8, hot: false },
  { c: 0xff4b3a, heat: 5, hot: false },
];
const OFFSET_Y = 140;      // finger -> ship upward offset (game units)
const BTN_D = 140, BTN_M = 28;
const BTN_X = W - BTN_M - BTN_D / 2, BTN_Y = H - BTN_M - BTN_D / 2;
const BEAM_SPEED = 1200, BEAM_H = 32;
const MAX_HEAT = 100, COOL = 4, WRONG_HEAT = 5;

class Play extends Phaser.Scene {
  constructor() { super('play'); }

  init() {
    this.score = 0; this.heat = 0; this.dragId = null; this.target = null; this.spawnT = 0;
  }

  create() {
    this.input.addPointer(2); // 3 pointers total
    this.stars = this.physics.add.group();
    this.beams = this.physics.add.group();

    this.ship = this.add.triangle(W / 2, H - 360, 0, 40, 20, 0, 40, 40, 0xffffff).setOrigin(0.5);
    this.physics.add.existing(this.ship);
    this.ship.body.setCircle(14, 6, 10);

    this.btn = this.add.circle(BTN_X, BTN_Y, BTN_D / 2, 0x888888, 0.6).setStrokeStyle(4, 0xffffff);
    this.add.text(BTN_X, BTN_Y, '발사', { fontSize: '36px', color: '#fff' }).setOrigin(0.5);

    this.scoreText = this.add.text(W / 2, 20, '+1 : 0', { fontSize: '44px', color: '#fff' }).setOrigin(0.5, 0);
    this.add.rectangle(24, 90, 300, 24, 0x333333).setOrigin(0, 0.5);
    this.heatBar = this.add.rectangle(24, 90, 0, 24, 0xff4b3a).setOrigin(0, 0.5);
    this.debug = this.add.text(8, H - 70, '', { fontSize: '20px', color: '#8f8', backgroundColor: '#000a' }).setDepth(10);

    this.physics.add.overlap(this.beams, this.stars, (b, s) => this.onBeamHit(b, s));
    this.physics.add.overlap(this.ship, this.stars, (sh, s) => this.onShipHit(s));

    this.input.on('pointerdown', p => {
      if (Phaser.Math.Distance.Between(p.x, p.y, BTN_X, BTN_Y) <= BTN_D / 2) { this.fire(); return; }
      if (this.dragId === null) { this.dragId = p.id; this.target = { x: p.x, y: p.y }; }
    });
    this.input.on('pointermove', p => { if (p.id === this.dragId) this.target = { x: p.x, y: p.y }; });
    const up = p => { if (p.id === this.dragId) { this.dragId = null; this.target = null; } };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  fire() {
    const b = this.add.rectangle(this.ship.x, this.ship.y - 24, 12, BEAM_H, 0xffffff);
    this.beams.add(b);
    b.body.setSize(12, BEAM_H);
    b.body.setVelocity(0, -BEAM_SPEED);
  }

  spawn() {
    const k = Phaser.Math.Between(0, 6), def = STARS[k];
    const r = Phaser.Math.Between(18, 44); // independent of color
    const s = this.add.circle(Phaser.Math.Between(r, W - r), -r, r, def.c, Phaser.Math.FloatBetween(0.6, 1));
    s.def = def;
    this.stars.add(s);
    s.body.setCircle(r);
    s.body.setVelocity(0, Phaser.Math.Between(160, 260));
  }

  onBeamHit(b, s) {
    if (s.def.hot) { this.score++; this.scoreText.setText('+1 : ' + this.score); }
    else this.addHeat(WRONG_HEAT);
    b.destroy(); s.destroy();
  }

  onShipHit(s) { this.addHeat(s.def.heat); s.destroy(); }

  addHeat(v) {
    this.heat += v;
    if (this.heat >= MAX_HEAT) {
      this.heat = 0; this.score = 0; this.scoreText.setText('+1 : 0');
      this.cameras.main.flash(200, 255, 80, 40);
    }
  }

  update(time, delta) {
    const dt = Math.min(delta, 100) / 1000;
    this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawn(); this.spawnT = 0.7; }
    this.heat = Math.max(0, this.heat - COOL * dt);
    this.heatBar.width = 300 * this.heat / MAX_HEAT;

    if (this.target) {
      const tx = Phaser.Math.Clamp(this.target.x, 20, W - 20);
      const ty = Phaser.Math.Clamp(this.target.y - OFFSET_Y, 20, H - 20);
      const k = 1 - Math.pow(0.0001, dt); // fast follow
      this.ship.x += (tx - this.ship.x) * k;
      this.ship.y += (ty - this.ship.y) * k;
    }
    for (const s of this.stars.getChildren().slice()) if (s.y > H + 80) s.destroy();
    for (const b of this.beams.getChildren().slice()) if (b.y < -60) b.destroy();

    this.debug.setText(`FPS ${this.game.loop.actualFps.toFixed(0)}  offsetY ${OFFSET_Y}  fireBtn ${BTN_D}px`);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: W, height: H,
  backgroundColor: '#05070f',
  input: { activePointers: 3 },
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Play],
});
