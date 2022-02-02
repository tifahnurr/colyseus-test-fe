import { Client, Room } from 'colyseus.js';
import { GameObjects, Input, Scene, Scenes, Types } from 'phaser';
import { SERVER_MSG } from '../Config/ServerMessages';
import { BattleSchema } from '../Schema/BattleSchema';

interface RTT {
  lastPing: number;
  currentRTT: number;
}

interface HP {
  amount: number;
}

const Movement = 10;

export default class GameScene extends Scene {
  client!: Client;

  battleRoom?: Room;

  sessionId?: string;

  playerId!: number;

  player?: Types.Physics.Arcade.ImageWithDynamicBody;

  players!: Map<number, GameObjects.Image>;

  stars!: Map<number, GameObjects.Image>;

  starGroup!: GameObjects.Group;

  bound = Math.pow(2, 12);

  cursors!: Types.Input.Keyboard.CursorKeys;

  gameHUD?: Scene;
  
  currentRTT!: RTT;

  hp!: HP;

  constructor() {
    super('GameScene');
  }

  init() {
    // reference need to be reset,
    // cause it's still hangging on when you destory it.
    this.resetReferences();

    // add fake player id, that maybe conflict with other cause its psudo
    // module by 65k because it is uint16 on the player schema
    this.playerId = (Math.floor(Math.random() * 1e5) + Date.now()) % 65000;

    // setup colyseus client
    this.client = new Client(`ws://${window.location.hostname}:2567`);

    // setups world bounds
    this.cameras.main.setBounds(0, 0, this.bound, this.bound);
    this.physics.world.setBounds(0, 0, this.bound, this.bound);

    // setup cursors input;
    this.cursors = this.input.keyboard.createCursorKeys();

    this.currentRTT.lastPing = Date.now();
    this.currentRTT.currentRTT = 0;

    this.starGroup = this.physics.add.group();
  }

  create() {
    // setup startfield background
    const background = this.add.tileSprite(
      0,
      0,
      this.bound,
      this.bound,
      'starfield',
    );
    background.setOrigin(0, 0);

    // connect to the colyseus room
    this.connect();

    this.setupRestartEvent();
  }

  update() {
    this.updatePlayersPosition(0.333);
    this.updateStarStatus();
    // player is undefined or not active
    if (!this.player?.active) {
      return;
    }

    // stop player
    this.player.setVelocity(0);

    // move player by cursors
    if (this.cursors.left.isDown) {
      this.player.setAngle(-90)
      this.player.x -= Movement;
    } else if (this.cursors.right.isDown) {
      this.player.setAngle(90)
      this.player.x += Movement
    }

    if (this.cursors.up.isDown) {
      this.player.setAngle(0)
      this.player.y -= Movement
    } else if (this.cursors.down.isDown) {
      this.player.setAngle(-180)
      this.player.y += Movement
    }

    // send player transform each tick
    this.sendMyPlayerTransform();
  }

  resetReferences() {
    this.battleRoom = undefined;
    this.player = undefined;
    this.playerId = 0;
    this.players = new Map();
    this.stars = new Map();
    this.currentRTT = {
      currentRTT: 0,
      lastPing: 0
    }
    this.hp = {
      amount: 100
    };
    this.time.removeAllEvents();
  }

  setupRestartEvent() {
    this.input.keyboard.removeListener('keup-R', this.restartScene, this);
    this.input.keyboard.once('keyup-R', this.restartScene, this);
  }

  restartScene() {
    this.goToNextScene('GameScene');
  }

  goToNextScene(scene: string, data?: object) {
    this.battleRoom?.leave();
    this.player?.destroy();
    this.players = new Map();
    this.stars = new Map();
    this.resetReferences();
    this.scene.start(scene, data);
  }

  async connect() {
    try {
      this.battleRoom = await this.client.joinOrCreate('battle_room');
    } catch (error) {
      throw new Error('failed to connect server');
    }
    this.setupBattleRoomEvents();
    this.setupSpawnButton();
    this.sessionId = this.battleRoom.sessionId;
    this.time.addEvent({
      loop: true, delay: 3000,
      callback: () => {
        this.pingServer();
      }
    })
  }

  setupSpawnButton() {
    const screenCenterX =
      this.cameras.main.worldView.x + this.cameras.main.width / 2;
    const screenCenterY =
      this.cameras.main.worldView.y + this.cameras.main.height / 2;
    const rectangle = this.add.rectangle(0, 0, 300, 150, 0x696969, 1);
    const spawnText = this.add
      .text(0, 0, 'START GAME', {
        fontSize: '32px',
        wordWrap: { width: 200 },
        align: 'center',
      })
      .setOrigin(0.5);
    const button = this.add.container(screenCenterX, screenCenterY, [
      rectangle,
      spawnText,
    ]);
    button.setDepth(1);
    rectangle.setInteractive().on(Input.Events.POINTER_DOWN, () => {
      if (!this.battleRoom) {
        return;
      }
      this.spawnMyPlayer();
      button.destroy();
    });
  }

  setupBattleRoomEvents() {
    if (!this.battleRoom) {
      return;
    }

    // ping pong handler
    this.battleRoom.onMessage(SERVER_MSG.PING, (message) => {
      this.battleRoom?.send(SERVER_MSG.PONG, message);
    });

    // register despawn listener
    this.battleRoom.onMessage(SERVER_MSG.DESPAWN, (id: number) => {
      this.despawnPlayer(id);
    });

    // on state have a change not a whole object
    this.battleRoom.onStateChange((state: BattleSchema) => {
      state.players.forEach((p) => {
        const { x, y } = p.position;
        p.isSpawned && this.handlePlayer(p.id, x, y, p.angle, p.score);
      });

      state.stars.forEach((s) => {
        const {x, y} = s.position;
        this.handleStar(s.id, x, y, s.isDespawned);
      })

      state.stars.onRemove = (s) => {
        this.despawnStar(s.id);
      }
    });


    this.battleRoom.onMessage(SERVER_MSG.PONG, (rtt: RTT) => {
      this.currentRTT.currentRTT = Date.now() - rtt.lastPing;
    })
  }

  spawnMyPlayer() {
    const data = {
      id: this.playerId,
      x: Math.floor(Math.random() * this.bound),
      y: Math.floor(Math.random() * this.bound),
    };

    // check on the server side
    this.battleRoom?.send('spawn', data);
    this.time.addEvent({
      loop: true, delay: 5000,
      callback: () => {
        console.log("decrease hp" + this.hp);
        this.hp.amount -= 3;
        if (this.hp.amount <= 0) {
          this.restartScene();
        };
      }
    })
    this.hp.amount = 100;
  }

  sendMyPlayerTransform() {
    if (!this.player?.active || !this.battleRoom) {
      return;
    }

    const data = {
      x: this.player.x,
      y: this.player.y,
      angle: this.player.angle,
    };

    // get metadata lastmove from player
    const lastMove = this.player.getData('lastMove');

    if (
      !lastMove ||
      lastMove.x !== data.x ||
      lastMove.y !== data.y ||
      lastMove.angle !== data.angle
    ) {
      try {
        this.battleRoom.send('move', data);
        this.player.setData('lastMove', data);
      } catch (error) {
        console.error(error);
      }
    }
  }

  despawnPlayer(id: number) {
    const player = this.players.get(id);
    player?.setX(-1000);
    player?.setY(-1000);
    player?.setVisible(false);
    player?.destroy();
    this.players.delete(id);
    if (id === this.playerId) {
      this.restartScene();
    }
  }

  despawnStar(id: number) {
    let star = this.stars.get(id);
    star?.setX(-1000).setX(-1000).setVisible(false).setActive(false);
    this.stars.delete(id);
  }

  handlePlayer(id: number, x: number, y: number, angle: number, score: number) {
    if (this.players.has(id)) {
      if (id !== this.playerId) {
        this.handlePlayerTransform(id, x, y, angle, score);
      } else {
        this.player?.setData('score', score);
      }

      return;
    }

    let player;
    if (id === this.playerId) {
      player = this.physics.add.image(x, y, 'space', 'playerShip1_blue.png');
      this.player = player;
      this.setupPlayerController();
      this.setupPlayerHUD();
      this.player.body.onOverlap = true;
      // console.log(this.stars);
      // this.stars?.forEach((star) => {
      //   this.physics.add.overlap(this.player as GameObjects.GameObject, star, this.handleCollisionWithStar, undefined, this);
      // });
      this.physics.add.overlap(this.player as GameObjects.GameObject, this.starGroup, this.handleCollisionWithStar, undefined, this);
      this.players?.forEach((player) => {
        this.physics.add.overlap(this.player as GameObjects.GameObject, player, this.handlePlayerCollision, undefined, this);
      })
    } else {
      player = this.add.image(x, y, 'space', 'playerShip1_red.png');
    }

    if (player) {
      player.setOrigin(0.5);
      player.setData('id', id);
      player.setData('transform', { x, y, angle: 0 });
      player.setData('score', score);
      this.physics.add.existing(player);
      if (this.player) {
        this.physics.add.overlap(this.player as GameObjects.GameObject, player, this.handlePlayerCollision, undefined, this);
      }
      this.players.set(id, player);
    }
  }

  handlePlayerTransform(id: number, x: number, y: number, angle: number, score: number) {
    const player = this.players.get(id);
    player?.setData('transform', { x, y, angle });
    player?.setData('score', score);
  }

  handleStarTransform(id: number, isDespawned: boolean) {
    const star = this.stars.get(id);
    star?.setData('isDespawned', isDespawned);
  }

  handleStar(id: number, x: number, y: number, isDespawned: boolean) {
    if (this.stars.has(id)) {
      this.handleStarTransform(id, isDespawned);
      return;
    }
    if (isDespawned) {
      return;
    }
    let star;
    star = this.starGroup.getFirstDead();
    if (!star) {
      star = this.add.image(x, y, 'space', 'star_gold.png');
      this.starGroup.add(star);
      // this.physics.add.existing(star);
      // this.player && this.physics.add.overlap(this.player as GameObjects.GameObject, star, this.handleCollisionWithStar, undefined, this)
    } 
    if (star) {
      star.setX(x);
      star.setY(y);
      star.setVisible(true);
      star.setActive(true);
      star.setAlpha(1);
      star.setOrigin(0.5);
      star.setData('id', id);
      star.setData('transform', {x, y});
      star.setData('isDespawned', isDespawned);
      this.stars.set(id, star);
    }
  }

  handleCollisionWithStar(player: any, star: any) {
    if (star.getData('isDespawned')) {
      return;
    }
    star.setData('isDespawned', true);
    this.battleRoom?.send('starCollected', {id: star.getData('id')});
    star.setVisible(false);
    star.x = -1000;
    star.y = -1000;
    this.hp.amount += 5;
    if (this.hp.amount >= 100) {
      this.hp.amount = 100
    }
  }

  handlePlayerCollision(playerA: any, playerB: any) {
    this.battleRoom?.send('playerCollision', {id: playerB.getData('id')});
    this.restartScene();
  }

  updatePlayersPosition(percentage: number) {
    this.players?.forEach((player) => {
      const id = player.getData('id') as number;
      if (id === this.playerId || !player) {
        return; // skip check
      }

      const { x: nX, y: nY, angle: nAngle } =
        (player.getData('transform') as {
          x: number;
          y: number;
          angle: number;
        }) || {};

      const { x, y } = player;
      player.setPosition(
        Phaser.Math.Linear(x, nX, percentage),
        Phaser.Math.Linear(y, nY, percentage),
      );
      player.setAngle(nAngle || 0);
    });
  }

  updateStarStatus() {
    this.stars?.forEach((star) => {
      const id = star.getData("id") as number;
      // if (!star) return;
      if (star.getData("isDespawned") as boolean) {
        star.setActive(false);
        star.setVisible(false);
        star.setX(-1000);
        star.setY(-1000);
        this.stars.delete(id);
      }
    })
  }

  pingServer() {
    this.currentRTT.lastPing = Date.now();
    this.battleRoom?.send(SERVER_MSG.PING, this.currentRTT);
  }

  setupPlayerController() {
    if (!this.player || !this.battleRoom) {
      return;
    }

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
  }

  setupPlayerHUD() {
    // use paralel scene for the HUD
    this.scene.launch('GameHUD', { player: this.player, scene: this, players: this.players, currentRTT: this.currentRTT, hp: this.hp});
    this.gameHUD = this.scene.get('GameHUD');
  }
}
