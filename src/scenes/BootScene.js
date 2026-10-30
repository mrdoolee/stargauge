import Phaser from 'phaser';
import { loadImages } from '../config/assets.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    loadImages(this); // only images listed in config/assets.js (those that exist), so nothing 404s
  }

  create() {
    if (this.registry.get('debugFps')) this.scene.launch('debugfps'); // ?debug=1 only
    this.scene.start(this.registry.get('debugStart') ?? 'title'); // debugStart only set by ?debug=1&mission=
  }
}
