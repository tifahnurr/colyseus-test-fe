import { Scene, GameObjects, Types } from 'phaser';

export default class GameHUD extends Scene {
  constructor() {
    super('GameHUD');
  }

  player?: Types.Physics.Arcade.ImageWithDynamicBody;

  playerCoord!: GameObjects.Text;

  init(data: { player: Types.Physics.Arcade.ImageWithDynamicBody }) {
    this.player = data?.player;
  }

  create() {
    this.playerCoord = this.add
      .text(0, 0, 'Player coordiate:', {
        font: '16px Arial',
      })
      .setOrigin(0);
  }

  update() {
    this.updatePlayerCoordinate();
  }

  updatePlayerCoordinate() {
    const { x, y } = this.player?.active ? this.player : { x: 0, y: 0 };
    const data = this.playerCoord.getData('data');
    const next = `${x.toFixed(0)}, ${y.toFixed(0)}`;
    if (data !== next) {
      this.playerCoord.setData('data', next);
      this.playerCoord.setText(`Player coordinate: ${next}`);
    }
  }
}
