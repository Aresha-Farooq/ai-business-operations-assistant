#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/c00e8c926d8cff70539c64f9138f30ef76c6cc21f302282041bdf81de9fc4244/contract';
import endContract from '../../snapshots/c00e8c926d8cff70539c64f9138f30ef76c6cc21f302282041bdf81de9fc4244/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/df7d7d5e01f2ca04fecfa1e68faea013ddc8c3161a47404f8154c97c4238c57d/contract';
import startContract from '../../snapshots/df7d7d5e01f2ca04fecfa1e68faea013ddc8c3161a47404f8154c97c4238c57d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('isActive', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
