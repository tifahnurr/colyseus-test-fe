import { Client, Room } from 'colyseus.js';
import { Game, GameObjects, Input, Scene, Scenes, Types } from 'phaser';
import { BattleSchema } from '../Schema/BattleSchema';

export default class StarGroup {

  stars!: Map<number, GameObjects.Image>;

  starGroup!: GameObjects.Group;

  scene!: Scene;

  constructor(scene: Scene) {
    console.log("construct star group")
    this.scene = scene;
    this.starGroup = scene.add.group();
    this.stars = new Map();
  }

  resetReferences() {
      this.stars = new Map();
  }

  handle(id: number, x: number, y: number, isDespawned: boolean) {
    if (this.stars.has(id)) {
        this.handleTransform(id, isDespawned);
        return;
      }
      if (isDespawned) {
        return;
      }
      let star;
      star = this.starGroup.getFirstDead();
      if (!star) {
        star = this.scene.add.image(x, y, 'space', 'star_gold.png');
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

  handleTransform(id: number, isDespawned: boolean) {
    const star = this.stars.get(id);
    star?.setData('isDespawned', isDespawned);
  }

  despawn(id: number) {
    let star = this.stars.get(id);
    star?.setX(-1000).setX(-1000).setVisible(false).setActive(false);
    this.stars.delete(id);
  }

  updateStatus() {
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

  getGroup() {
      return this.starGroup;
  }

  getMap() {
      return this.stars;
  }
  
  clear() {
    this.stars.forEach((s) => {
      this.despawn(s.getData('id'));
    })
  }
}