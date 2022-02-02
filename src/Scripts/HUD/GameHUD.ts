import { Scene, GameObjects, Types, Game } from 'phaser';

interface RTT {
  lastPing: number;
  currentRTT: number;
}

interface HP {
  amount: number;
}

export default class GameHUD extends Scene {
  constructor() {
    super('GameHUD');
  }

  player?: Types.Physics.Arcade.ImageWithDynamicBody;

  playerCoord!: GameObjects.Text;

  playerScore!: GameObjects.Text;

  players?: Map<number, GameObjects.Image>;

  playerRanking!: Array<GameObjects.Text>;

  rtt!: GameObjects.Text;

  currentRTT?: RTT;

  healthPoint!: GameObjects.Container;

  hp!: HP;

  init(data: { player: Types.Physics.Arcade.ImageWithDynamicBody, players: Map<number, GameObjects.Image>, currentRTT: RTT, hp: HP}) {
    this.player = data?.player;
    this.players = data?.players;
    this.currentRTT = data?.currentRTT;
    this.hp = data?.hp;
  }

  create() {
    const screenCenterX =
      this.cameras.main.worldView.x + this.cameras.main.width / 2;
    this.playerRanking = []
    this.playerCoord = this.add
      .text(0, 0, 'Player coordiate:', {
        font: '16px Arial',
      })
      .setOrigin(0);
    this.playerScore = this.add
      .text(0, 20, 'Score:', {
        font: '16px Arial'
      });
    this.rtt = this.add
      .text(0, 750, 'RTT: ', {
        font: '16px Arial'
      })
    for (let i = 0; i < 10; i++) {
      this.playerRanking.push(this.add
        .text(900, i * 20, `${i+1}. `, {
          font: "16px Arial"
        }))
    }
    const hpBg = this.add.image(0, 0, 'space', 'buttonBlue.png').setData('name', 'bg');
    const hpPercent = this.add.rectangle(0, 0, hpBg.width, hpBg.height - 5, 0xadd8e6).setData('name', 'percent').setData('maxWidth', hpBg.width);
    const hpText = this.add.text(0, 0, '100%', {font: "16px Arial", color: "#000000", align: "center"}).setOrigin(0.5, 0.5).setData('name', 'text');
    this.healthPoint = this.add.container(screenCenterX, 750, [hpBg, hpPercent, hpText]);
  }

  update() {
    this.updatePlayerCoordinate();
    this.updatePlayerScore();
    this.updatePlayerRanking();
    this.updateRTT();
    this.updateHp();
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

  updatePlayerScore() {
    const score = this.player?.active ? this.player.getData('score') : 0;
    const data = this.playerScore.getData('score');
    if (score !== data) {
      this.playerScore.setData('score', score);
      this.playerScore.setText(`Score: ${score}`);
    }
  }

  updatePlayerRanking() {
    let scores: Array<number> = [];
    this.players?.forEach((player) => {
      scores.push(player.getData('score'));
    });
    scores.sort((a, b) => {return (a < b ? 1 : a === b ? 0 : -1);});
    let isCurrentPlayerInRanking = false;
    for (let i = 0; i < 10; i++) {
      this.playerRanking[i].setColor("#ffffff");
      this.playerRanking[i].setText(`${i + 1}. ${scores[i] ? scores[i] : 0}`);
      if (scores[i] === this.player?.getData('score') && !isCurrentPlayerInRanking) {
        this.playerRanking[i].setColor('#add8e6');
        isCurrentPlayerInRanking = true;
      }
    }
  }

  updateRTT() {
    this.rtt.setText(`RTT: ${this.currentRTT?.currentRTT} ms  FPS: ${Math.floor(this.game.loop.actualFps)}`);
  }

  updateHp() {
    this.healthPoint.getAll().forEach((elmt: any) => {
      if (elmt.getData('name') === 'percent') {
        elmt.width = (this.hp.amount / 100) * elmt.getData('maxWidth');
      } else if (elmt.getData('name') === 'text') {
        elmt.setText(`${this.hp.amount}%`)
      }
    })
  }
}
