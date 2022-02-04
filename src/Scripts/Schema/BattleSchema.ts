// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 1.0.31
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { PlayerSchema } from './PlayerSchema'
import { StarSchema } from './StarSchema'
import { LaserSchema } from './LaserSchema'

export class BattleSchema extends Schema {
    @type({ map: PlayerSchema }) public players: MapSchema<PlayerSchema> = new MapSchema<PlayerSchema>();
    @type({ map: StarSchema }) public stars: MapSchema<StarSchema> = new MapSchema<StarSchema>();
    @type({ map: LaserSchema }) public lasers: MapSchema<LaserSchema> = new MapSchema<LaserSchema>();
}
