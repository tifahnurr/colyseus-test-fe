// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 1.0.31
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Vector2DSchema } from './Vector2DSchema'
import { Velocity } from './Velocity'

export class LaserSchema extends Schema {
    @type("boolean") public isDespawned!: boolean;
    @type("uint16") public id!: number;
    @type("uint16") public playerId!: number;
    @type(Vector2DSchema) public origin: Vector2DSchema = new Vector2DSchema();
    @type(Velocity) public velocity: Velocity = new Velocity();
}
