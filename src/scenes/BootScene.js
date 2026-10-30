import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    this.scene.start('title');
  }
}
