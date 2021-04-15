import { Client, Room } from 'colyseus.js';
import { Vector } from 'matter';
import { GameObjects, Input, Scene, Scenes, Types } from 'phaser';
import { BattleSchema } from '../Schema/BattleSchema';

export default class GameScene extends Scene {
  client!: Client;

  battleRoom?: Room;

  sessionId?: string;

  playerId!: number;

  player?: Types.Physics.Arcade.ImageWithDynamicBody;

  players!: Map<number, GameObjects.Image>;

  bound = Math.pow(2, 12);

  cursors!: Types.Input.Keyboard.CursorKeys;

  gameHUD?: Scene;

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

    // player is undefined or not active
    if (!this.player?.active) {
      return;
    }

    // stop player
    this.player.setVelocity(0);

    // move player by cursors
    if (this.cursors.left.isDown) {
      this.player.setAngle(-90).setVelocityX(-200);
    } else if (this.cursors.right.isDown) {
      this.player.setAngle(90).setVelocityX(200);
    }

    if (this.cursors.up.isDown) {
      this.player.setAngle(0).setVelocityY(-200);
    } else if (this.cursors.down.isDown) {
      this.player.setAngle(-180).setVelocityY(200);
    }

    // send player transform each tick
    this.sendMyPlayerTransform();
  }

  resetReferences() {
    this.battleRoom = undefined;
    this.player = undefined;
    this.players = new Map();
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
    this.resetReferences();
    this.scene.start(scene, data)
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
  }

  setupSpawnButton() {
    const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
    const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;
    const rectangle = this.add.rectangle(0, 0, 300, 150, 0x696969, 1);
    const spawnText = this.add.text(0, 0, 'START GAME', {
      fontSize: '32px',
      wordWrap: { width: 200 },
      align: 'center'
    }).setOrigin(0.5);
    const button = this.add.container(screenCenterX, screenCenterY, [rectangle, spawnText]);
    rectangle
      .setInteractive()
      .on(Input.Events.POINTER_DOWN, () => {
        if (!this.battleRoom) { return; }
        this.spawnMyPlayer();
        button.destroy();
      })
  }

  setupBattleRoomEvents() {
    if (!this.battleRoom) {
      return;
    }

    // register despawn listener
    this.battleRoom.onMessage('despawn', (id: number) => {
      this.despawnPlayer(id);
    });

    // on state have a change not a whole object
    this.battleRoom.onStateChange((state: BattleSchema) => {
      state.players.forEach((p) => {
        const { x, y } = p.position;
        p.isSpawned && this.handlePlayer(p.id, x, y, p.angle);
      });
    });
  }

  spawnMyPlayer() {
    const data = {
      id: this.playerId,
      x: Math.floor(Math.random() * this.bound),
      y: Math.floor(Math.random() * this.bound),
    };

    // check on the server side
    this.battleRoom?.send('spawn', data);
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
    player?.destroy();
    this.players.delete(id);
  }

  handlePlayer(id: number, x: number, y: number, angle: number) {
    if (this.players.has(id)) {
      if (id !== this.playerId) {
        this.handlePlayerTransform(id, x, y, angle);
      }

      return;
    }

    let player;
    if (id === this.playerId) {
      player = this.physics.add.image(x, y, 'space', 'playerShip1_red.png');
      this.player = player;
      this.setupPlayerController();
      this.setupPlayerHUD();
    } else {
      player = this.add.image(x, y, 'space', 'playerShip1_red.png');
    }

    if (player) {
      player.setOrigin(0.5);
      player.setData('id', id);
      player.setData('transform', { x, y, angle: 0 });
      this.players.set(id, player);
    }
  }

  handlePlayerTransform(id: number, x: number, y: number, angle: number) {
    const player = this.players.get(id);
    player?.setData('transform', { x, y, angle });
  }

  updatePlayersPosition(percentage: number) {
    this.players?.forEach((player) => {
      const id = player.getData('id') as number;
      if (id === this.playerId || !player) {
        return; // skip check
      }

      const { x: nX, y: nY, angle: nAngle } = player.getData('transform') as {
        x: number;
        y: number;
        angle: number;
      } || {};

      const { x, y } = player;
      player.setPosition(
        Phaser.Math.Linear(x, nX, percentage),
        Phaser.Math.Linear(y, nY, percentage),
      );
      player.setAngle(nAngle || 0);
    });
  }

  setupPlayerController() {
    if (!this.player || !this.battleRoom) {
      return;
    }

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
  }

  setupPlayerHUD() {
    // use paralel scene for the HUD
    this.scene.launch('GameHUD', { player: this.player, scene: this });
    this.gameHUD = this.scene.get('GameHUD');
  }
}
