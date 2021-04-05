import {Scene} from 'phaser';

export default class PreloadScene extends Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.load.path = 'src/Assets/'
    this.load.spritesheet('grass_atlas', 'n_grass_atlas.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.atlasXML('space', 'spacesheet.png', 'spacesheet.xml');
  }

  create() {
    // this.add.image(50, 50, 'grass_atlas', 0);
    // this.add.image(300, 300, 'space', 'playerShip1_red.png');
    this.scene.start('GameScene');
  }
} 