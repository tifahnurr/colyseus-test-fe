import { Client, Room } from 'colyseus.js';
import { Game, GameObjects, Input, Physics, Scene, Scenes, Types } from 'phaser';
import { BattleSchema } from '../Schema/BattleSchema';


const Velocity = 1000

const Color = ["Blue", "Green", "Red", "Red"]
export default class Lasers {

  lasers!: Map<number, Physics.Arcade.Image>;

  group!: GameObjects.Group;

  scene!: Scene;

  constructor(scene: Scene) {
    console.log("construct laser group")
    this.scene = scene;
    this.group = scene.physics.add.group();
    this.lasers = new Map();
  }

  resetReferences() {
      this.lasers = new Map();
  }

  spawnCurrent(player: Types.Physics.Arcade.ImageWithDynamicBody) {
      if (!player) return;
      if (player.getData('isShooting')) return;
      player.setData('isShooting', true);
      this.scene.time.addEvent({
        delay: 500, loop: false,
        callback: () => {
          player.setData('isShooting', false)
        }
      })
      const angle = player.angle;
      let velocity = {
          x: 0,
          y: 0
      }
      switch (angle) {
          case 0:
              velocity.y = -1 * Velocity;
              break;
          case 90:
              velocity.x = Velocity;
              break;
          case -90:
              velocity.x = -1 * Velocity
              break;
          case -180:
              velocity.y = Velocity;
              break;
      }
      let laser:Physics.Arcade.Image = this.group.getFirstDead();
      if (!laser) {
        console.log("create new laser");
          laser = this.scene.physics.add.image(-1000, -1000, 'space', `laser${Color[player.getData('id') % 4]}07.png`);
          this.group.add(laser)
      }
      if (laser) {

        laser.setTexture('space', `laser${Color[player.getData('id') % 4]}07.png`);
          const id = (Math.floor(Math.random() * 1e5) + Date.now()) % 65000;
          laser.setAngle(angle)
          laser.setX(player.x);
          laser.setY(player.y);
          laser.setVisible(true);
          laser.setAlpha(1);
          laser.setActive(true);
          laser.setVelocity(velocity.x, velocity.y);
          laser.setData('id', id);
          laser.setData('currentPlayer', true);
          laser.setData('playerId', 0);
          this.lasers.set(id, laser);
          this.scene.events.emit('shootLaser', id, velocity.x, velocity.y);
          this.scene.time.addEvent({
            delay: 1000, loop: false,
            callback: () => {
              if (laser.getData('id') === id) {
                this.despawn(laser)
              }
            }
          })
      }
  }

  handle(id: number, x: number, y: number, isDespawned: boolean, velocityX: number, velocityY: number, playerId: number) {
    if (this.lasers.has(id)) {
        this.handleTransform(id, isDespawned);
        return;
      }
      if (isDespawned) {
        return;
      }
      let laser: any;
      laser = this.group.getFirstDead();
      if (!laser) {
        console.log("create new laser")
        laser = this.scene.physics.add.image(x, y, 'space', `laser${Color[playerId % 4]}07.png`);
        this.group.add(laser);
        // this.physics.add.existing(laser);
        // this.player && this.physics.add.overlap(this.player as GameObjects.GameObject, laser, this.handleCollisionWithlaser, undefined, this)
      } 
      if (laser) {
        laser.setTexture('space', `laser${Color[playerId % 4]}07.png`);
        laser.setX(x);
        laser.setY(y);
        laser.setVisible(true);
        laser.setActive(true);
        laser.setAlpha(1);
        laser.setOrigin(0.5);
        velocityX !== 0 && laser.setAngle(90);
        velocityY !== 0 && laser.setAngle(0);
        laser.setVelocity(velocityX, velocityY);
        laser.setData('id', id);
        laser.setData('transform', {x, y});
        laser.setData('isDespawned', isDespawned);
        laser.setData('currentPlayer', false);
        laser.setData('playerId', playerId);
        this.lasers.set(id, laser);
        this.scene.time.addEvent({
          delay: 1000, loop: false,
          callback: () => {
            if (laser.getData('id') === id) {
              this.despawn(laser)
            }
          }
        })
      }
  }

  handleTransform(id: number, isDespawned: boolean) {
    const laser = this.lasers.get(id);
    laser?.setData('isDespawned', isDespawned);
  }

  despawn(laser: number | any) {
    if (typeof laser === 'number') {
      const l = this.lasers.get(laser);
      l?.setX(-1000).setY(-1000).setVisible(false);
    } else {
      laser?.setX(-1000).setY(-1000).setVisible(false);
      laser?.setVelocity(0, 0);
    }
  }

  updateStatus() {
    this.lasers?.forEach((laser) => {
      const id = laser.getData("id") as number;
      // if (!laser) return;
      if (laser.getData("isDespawned") as boolean) {
        laser.setActive(false);
        laser.setVisible(false);
        laser.setX(-1000);
        laser.setY(-1000);
        this.lasers.delete(id);
      }
    })
  }

  getGroup() {
      return this.group;
  }

  getMap() {
    return this.lasers;
  }

  remove(id: number) {
    const laser = this.lasers.get(id);
    this.despawn(laser);
    laser?.setActive(false);
    this.lasers.delete(id);
  }

  clear() {
    this.lasers.forEach((l) => {
      this.despawn(l);
      this.remove(l.getData('id'));
    })
  }
}