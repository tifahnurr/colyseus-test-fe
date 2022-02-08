import { Client, Room } from 'colyseus.js';
import { GameObjects, Input, Scene, Scenes, Types } from 'phaser';
import { SERVER_MSG } from '../Config/ServerMessages';
import StarGroup from '../Object/StarGroup';

import Lasers from '../Object/Lasers';
import { BattleSchema } from '../Schema/BattleSchema';

interface RTT {
  lastPing: number;
  currentRTT: number;
}

interface HP {
  amount: number;
}

const Movement = 10;

const ServerUrl = "wss://colyseus-test-server.herokuapp.com";
// const ServerUrl = "ws://127.0.0.1:2567"

const PlayerSprite = ["playerShip1_blue.png", "playerShip1_green.png", "playerShip1_orange.png", "playerShip1_red.png",
                      "playerShip2_blue.png", "playerShip2_green.png", "playerShip2_orange.png", "playerShip2_red.png",
                      "playerShip3_blue.png", "playerShip3_green.png", "playerShip3_orange.png", "playerShip3_red.png"
                    ];

export default class GameScene extends Scene {
  client!: Client;

  battleRoom?: Room;

  sessionId?: string;

  playerId!: number;

  player?: Types.Physics.Arcade.ImageWithDynamicBody;

  starGroup!: StarGroup;

  players!: Map<number, GameObjects.Image>;

  lasers!: Lasers;

  laserGroup!: GameObjects.Group;

  bound = Math.pow(2, 12);

  cursors!: Types.Input.Keyboard.CursorKeys;

  spaceButton!: Input.Keyboard.Key;

  gameHUD?: Scene;
  
  currentRTT!: RTT;

  hp!: HP;

  isGameOver: boolean = false;

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
    this.client = new Client(`${ServerUrl}`);

    // setups world bounds
    this.cameras.main.setBounds(0, 0, this.bound, this.bound);
    this.physics.world.setBounds(0, 0, this.bound, this.bound);

    // setup cursors input;
    this.cursors = this.input.keyboard.createCursorKeys();

    this.spaceButton = this.input.keyboard.addKey('SPACE');

    this.currentRTT.lastPing = Date.now();
    this.currentRTT.currentRTT = 0;

    this.starGroup = new StarGroup(this);
    this.lasers = new Lasers(this);
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
    this.events.on('shootLaser', this.broadcastLaser, this);
  }

  update() {
    this.updatePlayersPosition(0.333);
    this.starGroup.updateStatus();
    if (!this.isGameOver) {
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
  
      if (this.spaceButton.isDown) {
        this.lasers.spawnCurrent(this.player);
      }
  
      // this.checkLaserOverlap();
      if (this.lasers.getGroup().getFirstAlive()) {
        this.checkLaserOverlap();
      }
      this.checkHp();
      // send player transform each tick
      this.sendMyPlayerTransform();
    }
  }

  resetReferences() {
    this.isGameOver = false;
    this.battleRoom = undefined;
    this.player = undefined;
    this.playerId = 0;
    this.players?.forEach((p) => {
      this.players?.delete(p.getData('id'));
      p?.destroy();
    })
    this.players = new Map();
    this.starGroup?.resetReferences();
    this.currentRTT = {
      currentRTT: 0,
      lastPing: Date.now()
    }
    this.hp = {
      amount: 100
    };
    this.time.removeAllEvents();
    this.events.off ('shootLaser');
  }

  setupRestartEvent() {
    this.input.keyboard.removeListener('keup-R', this.restartScene, this);
    this.input.keyboard.once('keyup-R', this.restartScene, this);
  }

  restartScene() {
    this.goToNextScene('GameScene');
  }

  goToNextScene(scene: string, data?: object) {
    this.resetReferences();
    this.scene.start(scene, data);
  }

  leave() {
    // this.battleRoom?.send("leave");
    this.battleRoom?.leave();
    this.player?.destroy();
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
        !this.isGameOver;
      }
    })
  }

  async reconnect() {
    this.client = new Client(`${ServerUrl}`);
    try {
      this.client.reconnect(String(this.battleRoom?.id), String(this.battleRoom?.sessionId)).then((room) => {
        this.battleRoom = room;
        this.starGroup.clear();
        this.lasers.clear();
        this.setupBattleRoomEvents();
        this.sessionId = this.battleRoom.sessionId;
      })
    } catch (e) {
      console.log("cannot reconnect");
    }
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

  setupRestartButton() {
    const screenCenterX =
      this.cameras.main.worldView.x + this.cameras.main.width / 2;
    const screenCenterY =
      this.cameras.main.worldView.y + this.cameras.main.height / 2;
    const rectangle = this.add.rectangle(0, 0, 300, 150, 0x696969, 1);
    const spawnText = this.add
      .text(0, 0, 'Try Again', {
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
      button.destroy();
      this.leave();
      setTimeout(() => {
        this.restartScene();
      }, 50)
    });
  }

  gameover() {
    this.isGameOver = true;
    this.cameras.main.stopFollow();
    this.setupRestartButton();
    this.player?.setVelocity(5, 5);
    this.player?.setTint(0x555555);
    // this.resetReferences();
    this.battleRoom?.send('gameover');
  }

  setupBattleRoomEvents() {
    if (!this.battleRoom) {
      return;
    }

    this.battleRoom?.onStateChange.once((state) => {
      console.log("this is the first room state!", state);
    });

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
        p.isSpawned && this.handlePlayer(p.id, x, y, p.angle, p.score, p.hp);
      });

      state.players.onRemove = (p) => {
        this.despawnPlayer(p.id);
      }

      state.stars.forEach((s) => {
        const {x, y} = s.position;
        this.starGroup.handle(s.id, x, y, s.isDespawned);
      })

      state.stars.onRemove = (s) => {
        this.starGroup.despawn(s.id);
      }

      state.lasers.forEach((l) => {
        if (l.playerId !== this.playerId) {
          this.lasers.handle(l.id, l.origin.x, l.origin.y, l.isDespawned, l.velocity.x, l.velocity.y, l.playerId);
        }
      })

      state.lasers.onRemove = (l) => {
        this.lasers.remove(l.id);
      }
    });


    this.battleRoom.onMessage(SERVER_MSG.PONG, (lastPing: number) => {
      this.currentRTT.currentRTT = Date.now() - lastPing;
      this.currentRTT.lastPing = Date.now();
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
    // this.time.addEvent({
    //   loop: true, delay: 3000,
    //   callback: () => {
    //     if (!this.isGameOver) {
    //       this.hp.amount -= 3;
    //     }
    //   }
    // })
    this.hp.amount = 100;
  }

  checkHp() {
    if (this.hp.amount <= 0) {
      this.hp.amount = 0;
      this.gameover();
    }
  }

  updateHp() {
    this.battleRoom?.send("updateHp", {hp: this.hp.amount})
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
        this.checkStarOverlap();
      } catch (error) {
        console.error(error);
      }
    }
  }

  despawnPlayer(id: number) {
    if (id === this.playerId) {
      !this.isGameOver && this.gameover();
      return;
    }
    const player = this.players.get(id);
    player?.setX(-1000);
    player?.setY(-1000);
    player?.setVisible(false);
    player?.destroy();
    this.players.delete(id);
  }

  handlePlayer(id: number, x: number, y: number, angle: number, score: number, hp: number) {
    if (this.players.has(id)) {
      if (id !== this.playerId) {
        this.handlePlayerTransform(id, x, y, angle, score, hp);
      } else {
        this.player?.setData('score', score);
        if (this.hp.amount !== hp) {
          this.player?.setData('hp',  hp);
          this.hp.amount = hp;
        }
      }
      return;
    }

    let player;
    if (id === this.playerId) {
      player = this.physics.add.image(x, y, 'space', PlayerSprite[id % 12]);
      this.player = player;
      this.setupPlayerController();
      this.setupPlayerHUD();
      this.player.body.onOverlap = true;
      // this.physics.add.overlap(this.player as GameObjects.GameObject, this.starGroup.getGroup(), this.handleCollisionWithStar, undefined, this);
      // this.physics.add.overlap(this.player as GameObjects.GameObject, this.lasers.getGroup(), this.handleCollisionWithLaser, undefined, this);
      this.players?.forEach((player) => {
        this.physics.add.overlap(this.player as GameObjects.GameObject, player, this.handlePlayerCollision, undefined, this);
      })
    } else {
      player = this.add.image(x, y, 'space', PlayerSprite[id % 12]);
    }

    if (player) {
      player.setOrigin(0.5);
      player.setData('id', id);
      player.setData('transform', { x, y, angle: 0 });
      player.setData('score', score);
      player.setData('hp', hp);
      this.physics.add.existing(player);
      if (this.player) {
        this.physics.add.overlap(this.player as GameObjects.GameObject, player, this.handlePlayerCollision, undefined, this);
      }
      this.players.set(id, player);
    }
  }

  handlePlayerTransform(id: number, x: number, y: number, angle: number, score: number, hp: number) {
    const player = this.players.get(id);
    player?.setData('transform', { x, y, angle });
    player?.setData('score', score);
    player?.setData('hp', hp)
  }


  handleCollisionWithStar(_: any, star: any) {
    if (star.getData('isDespawned') || !star.visible) {
      return;
    }
    // star.setData('isDespawned', true);
    this.battleRoom?.send('starCollected', {id: star.getData('id')});
    star.setVisible(false);
    star.x = -1000;
    star.y = -1000;
    // this.hp.amount += 5;
    // if (this.hp.amount >= 100) {
    //   this.hp.amount = 100
    // }
    // this.updateHp();
  }

  handleCollisionWithLaser(player: any, laser: any) {
    if (!laser || !laser.visible) {
      return;
    }
    // star.setData('isDespawned', true);
    laser.setVisible(false);
    laser.x = -1000;
    laser.y = -1000;
    if (laser.getData('currentPlayer') || player) {
      this.battleRoom?.send('laserHit', {id: player.getData('id'), laserId: laser.getData('id')});
    }
  }


  checkStarOverlap() {
    this.starGroup.getMap().forEach((s) => {
      if (this.player?.getBounds().contains(s.x, s.y)) {
        this.handleCollisionWithStar(undefined, s);
      }
    })
  }

  checkLaserOverlap() {
    this.lasers.getMap().forEach((l) => {
      if (this.player?.getBounds().contains(l.x, l.y) && !(l.getData('currentPlayer'))) {
        this.handleCollisionWithLaser(undefined, l);
      }
      this.players.forEach((p) => {
        if (p.getData('id') !== this.playerId && l.getData('playerId') !== p.getData('id')) {
          // console.log('laser hit');
          if (p.getBounds().contains(l.x, l.y)) {
            this.handleCollisionWithLaser(p, l);
          }
        }
      })
    })
  }

  handlePlayerCollision(playerA: any, playerB: any) {
    this.battleRoom?.send('playerCollision', {id: playerB.getData('id')});
    this.gameover();
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


  pingServer() {
    this.battleRoom?.send(SERVER_MSG.PING, Date.now());
    if (Date.now() - this.currentRTT.lastPing > 5000) {
      this.reconnect();
    }
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

  broadcastLaser(id: number, x: number, y: number) {
    this.battleRoom?.send('shoot', {id: id, x: x, y: y});
  }
}
