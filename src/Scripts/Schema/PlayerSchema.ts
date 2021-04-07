// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 1.0.16
// 

import { Schema, type, ArraySchema, MapSchema, DataChange } from '@colyseus/schema';
import { Vector2DSchema } from './Vector2DSchema'

export class PlayerSchema extends Schema {
    @type("boolean") public isSpawned!: boolean;
    @type("uint16") public id!: number;
    @type("number") public angle!: number;
    @type(Vector2DSchema) public position: Vector2DSchema = new Vector2DSchema();
}
