import { Types, AUTO, Scale } from 'phaser';
import GameHUD from '../HUD/GameHUD';
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
      debug: false,
    },
  },
  backgroundColor: '#101010',
  scene: [PreloadScene, GameScene, GameHUD],
};

export default config;
