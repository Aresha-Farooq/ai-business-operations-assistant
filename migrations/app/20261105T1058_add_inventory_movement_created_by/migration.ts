


import type { Contract as Start } from '../../snapshots/a57bee347bd7b49064c0bed3f7e1ab01985d8b923f17f617731a12efc0a773ae/contract';

import startContract from '../../snapshots/a57bee347bd7b49064c0bed3f7e1ab01985d8b923f17f617731a12efc0a773ae/contract.json' with { type: 'json' };

import type { Contract as End } from '../../snapshots/df7d7d5e01f2ca04fecfa1e68faea013ddc8c3161a47404f8154c97c4238c57d/contract';

import endContract from '../../snapshots/df7d7d5e01f2ca04fecfa1e68faea013ddc8c3161a47404f8154c97c4238c57d/contract.json' with { type: 'json' };

import {
  Migration,
  MigrationCLI,
  col,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'inventoryMovement',
        column: col('createdBy', 'int4', {
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),

      this.createIndex({
        schema: 'public',
        table: 'inventoryMovement',
        index: 'inventoryMovement_createdBy_idx_ba0f792f',
        columns: ['createdBy'],
      }),

      this.addForeignKey({
        schema: 'public',
        table: 'inventoryMovement',
        foreignKey: {
          name: 'inventoryMovement_createdBy_fkey',
          columns: ['createdBy'],
          references: {
            schema: 'public',
            table: 'user',
            columns: ['id'],
          },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
