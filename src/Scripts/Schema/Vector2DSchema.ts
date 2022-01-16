//
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
//
// GENERATED USING @colyseus/schema 1.0.16
//

import {
  Schema,
  type,
  ArraySchema,
  MapSchema,
  DataChange,
} from '@colyseus/schema';

export class Vector2DSchema extends Schema {
  @type('number') public x!: number;
  @type('number') public y!: number;
}
