import {Loader, Scene} from 'phaser';

export default class PreloadScene extends Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    
    this.load.start();
    this.load.once(Loader.Events.COMPLETE, () => {
      this.scene.start('GameScene');
    });
    this.load.path = 'src/Assets/';
    this.load.image('starfield', 'starfield.jpeg');
    this.load.spritesheet('grass_atlas', 'n_grass_atlas.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.atlasXML('space', 'spacesheet.png', 'spacesheet.xml');
    
  }
} 