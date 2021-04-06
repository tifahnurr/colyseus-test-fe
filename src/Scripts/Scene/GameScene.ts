import { Client, Room } from 'colyseus.js';
import { Vector } from 'matter';
import { GameObjects, Input, Scene, Types } from 'phaser';

export default class GameScene extends Scene {
  client!: Client;

  room?: Room;

  sessionId?: string;

  playerId!: number;

  player?: Types.Physics.Arcade.ImageWithDynamicBody;

  players: Map<number, GameObjects.Image>;

  bound = Math.pow(2, 12);

  cursors!: Types.Input.Keyboard.CursorKeys;

  constructor() {
    super('GameScene');

    this.players = new Map();
  }

  init() {
    this.playerId = (Math.floor(Math.random() * 1e5) + Date.now()) % 1e5;
    this.client = new Client(`ws://${window.location.hostname}:2567`);
    this.cameras.main.setBounds(0, 0, this.bound, this.bound);
    this.physics.world.setBounds(0, 0, this.bound, this.bound);

    this.cursors = this.input.keyboard.createCursorKeys();
  }

  create() {
    const background = this.add.tileSprite(
      0,
      0,
      this.bound,
      this.bound,
      'starfield',
    );
    background.setOrigin(0, 0);

    this.connect();
  }

  update() {
    this.updatePlayersPosition(0.333);
    if (!this.player) {
      return;
    }

    this.player.setVelocity(0);

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

    this.sendMyPlayerTransform();
  }

  async connect() {

    try {
      this.room = await this.client.joinOrCreate('battle_room');
    } catch (error) {
      throw new Error('failed to connect server');
    }
    
    this.setupRoomEvents();
    this.setupSpawnButton();
    this.sessionId = this.room.sessionId;
  }

  setupSpawnButton() {
    const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
    const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;
    const rectangle = this.add.rectangle(0, 0, 300, 150, 0x696969, 1);
    const spawnText = this.add.text(0, 0, 'START GAME', {
      fontSize: '32px',
      wordWrap: {width: 200},
      align: 'center'
    }).setOrigin(0.5);
    const button = this.add.container(screenCenterX, screenCenterY, [rectangle, spawnText]);
    rectangle
    .setInteractive()
    .on(Input.Events.POINTER_DOWN, () => {
      this.spawnMyPlayer();
      button.destroy();
    })
  }

  setupRoomEvents() {
    if (!this.room) {
      return;
    }

    this.room.onMessage('spawn', () => {
      this.spawnMyPlayer();
    });

    this.room.onMessage('leave', (id: number) => {
      this.despawnPlayer(id);
    });

    this.room.onStateChange((state) => {
      state.players.forEach((p: any) => {
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
    this.room?.send('spawn', data);
  }

  sendMyPlayerTransform() {
    if (!this.player || !this.room) {
      return;
    }
    const data = {
      x: this.player.x,
      y: this.player.y,
      angle: this.player.angle,
    };

    const lastMove = this.player.getData('lastMove');
    
    if (
      !lastMove ||
      lastMove.x !== data.x ||
      lastMove.y !== data.y ||
      lastMove.angle !== data.angle
    ) {
      this.room.send('move', data);
      this.player.setData('lastMove', data);
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
    this.players.forEach((player) => {
      const id = player.getData('id') as number;
      if (id === this.playerId) {
        return; // skip check
      }

      const { x: nX, y: nY, angle: nAngle } = player.getData('transform') as {
        x: number;
        y: number;
        angle: number;
      };
      const { x, y } = player;
      player.setPosition(
        Phaser.Math.Linear(x, nX, percentage),
        Phaser.Math.Linear(y, nY, percentage),
      );
      player.setAngle(nAngle || 0);
    });
  }

  setupPlayerController() {
    if (!this.player || !this.room) {
      return;
    }

    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    // this.player.setVelocity(20);
  }
}
