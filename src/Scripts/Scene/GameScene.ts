import { Scene } from 'phaser';

export default class GameScene extends Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.add.image(300, 300, 'space', 'playerShip1_red.png');
  }
}