import { Scene, GameObjects, Types, Game } from 'phaser';

interface RTT {
  lastPing: number;
  currentRTT: number;
}

interface HP {
  amount: number;
}

const ColorString = ["Blue", "Green", "Yellow", "Red"];
const ColorCode = [0xadd8e6, 0x62bd69, 0xffe800, 0xc58080]
const ColorCodeString = ["#add8e6", "#62bd69", "#ff9d5c", "#c58080"]

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

  lastUpdate!: number;

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
    const hpBg = this.add.image(0, 0, 'space', `button${ColorString[this.player?.getData('id') % 4]}.png`).setData('name', 'bg');
    const hpPercent = this.add.rectangle(0, 0, hpBg.width, hpBg.height - 5, ColorCode[this.player?.getData('id') % 4]).setData('name', 'percent').setData('maxWidth', hpBg.width);
    const hpText = this.add.text(0, 0, '100%', {font: "16px Arial", color: "#000000", align: "center"}).setOrigin(0.5, 0.5).setData('name', 'text');
    this.healthPoint = this.add.container(screenCenterX, 750, [hpBg, hpPercent, hpText]);
    this.lastUpdate = 0;
  }

  update() {
    this.updatePlayerCoordinate();
    this.updatePlayerScore();
    this.updateHp();

    if (Date.now() - this.lastUpdate < 3000) return;
    this.lastUpdate = Date.now();
    this.updatePlayerRanking();
    this.updateRTT();
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
      this.updatePlayerRanking();
    }
  }

  updatePlayerRanking() {
    let scores: Array<{id: number, score:number}> = [];
    this.players?.forEach((player) => {
      scores.push({id: player.getData('id'), score: player.getData('score')});
    });
    scores.sort((a, b) => {return (a.score < b.score ? 1 : a.score === b.score ? 0 : -1);});
    let isCurrentPlayerInRanking = false;
    for (let i = 0; i < 10; i++) {
      this.playerRanking[i].setColor(scores[i] ? ColorCodeString[scores[i].id % 4] : "#ffffff");
      this.playerRanking[i].setText(`${i + 1}. ${scores[i] ? scores[i].score : 0}`);
      if (scores[i] && scores[i].id === this.player?.getData('id') && !isCurrentPlayerInRanking) {
        this.playerRanking[i].text += " < YOU";
        isCurrentPlayerInRanking = true;
      }
    }
  }

  updateRTT() {
    this.rtt.setText(`RTT: ${this.currentRTT?.currentRTT} ms  FPS: ${Math.floor(this.game.loop.actualFps)}`);
  }

  updateHp() {
    if (this.hp.amount === this.healthPoint.getData('hp')) return;
    this.healthPoint.setData('hp', this.hp.amount);
    this.healthPoint.getAll().forEach((elmt: any) => {
      if (elmt.getData('name') === 'percent') {
        elmt.width = (this.hp.amount / 100) * elmt.getData('maxWidth');
      } else if (elmt.getData('name') === 'text') {
        elmt.setText(`${this.hp.amount}%`)
      }
    })
  }
}
