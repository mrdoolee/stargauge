// FPS overlay. Only ever started when the URL has ?debug=1 (see main.js); otherwise this scene is
// never added, so it costs nothing. Shows: current FPS / min over the last ~10 s / min since mission start.
import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config/game.js';
import { HUD_SAFE_MARGIN } from '../config/balance.js';
import { FpsTracker } from '../config/debug.js';

export default class DebugFpsScene extends Phaser.Scene {
  constructor() {
    super('debugfps');
  }

  create() {
    this.tracker = new FpsTracker();
    this.lastNow = performance.now();
    this.nextText = 0;
    this.missionKey = null;
    // Bottom-left: the top corners hold the HUD buttons, the bottom-right holds the fire button.
    this.label = this.add
      .text(HUD_SAFE_MARGIN, GAME_HEIGHT - HUD_SAFE_MARGIN, '', {
        fontFamily: 'monospace', fontSize: '22px', color: '#7dff9a', backgroundColor: '#000000aa', padding: { x: 6, y: 4 },
      })
      .setOrigin(0, 1)
      .setDepth(1000);
    this.onMission = m => {
      if (m?.key === this.missionKey) return; // the HUD re-emits mission-start; only a new scene resets
      this.missionKey = m?.key ?? null;
      this.tracker.reset();
    };
    this.game.events.on('mission-start', this.onMission);
    this.events.once('shutdown', () => this.game.events.off('mission-start', this.onMission));
  }

  update() {
    const now = performance.now();
    this.tracker.frame(now - this.lastNow, now);
    this.lastNow = now;
    if (now < this.nextText) return;
    this.nextText = now + 250;
    const t = this.tracker;
    const f = v => (Number.isFinite(v) ? v.toFixed(0) : '-');
    this.label.setText(`FPS ${f(t.fps)}  최저(10초) ${f(t.windowMin(now))}  최저(전체) ${f(t.overallMin)}`);
    this.scene.bringToTop(); // missions bring the HUD to the top; stay above it
  }
}
