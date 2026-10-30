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
    this.scene.start('title');
  }
}
