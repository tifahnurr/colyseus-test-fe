import { Types, AUTO, Scale } from 'phaser';
import GameScene from '../Scene/GameScene';
import PreloadScene from '../Scene/PreloadScene';

export type PhaserConfig = Types.Core.GameConfig;

const config: PhaserConfig = {
  title: 'Phaser Game',
  type: AUTO,
  scale: {
    parent: 'phaser-app',
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  backgroundColor: '#493a52',
  scene: [PreloadScene, GameScene]
};

export default config;