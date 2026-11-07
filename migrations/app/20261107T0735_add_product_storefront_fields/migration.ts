#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5e0ea89884786b7bd2de0ffee419e46a944792b1ba668fe00ca45e3bdd3f0446/contract';
import endContract from '../../snapshots/5e0ea89884786b7bd2de0ffee419e46a944792b1ba668fe00ca45e3bdd3f0446/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c00e8c926d8cff70539c64f9138f30ef76c6cc21f302282041bdf81de9fc4244/contract';
import startContract from '../../snapshots/c00e8c926d8cff70539c64f9138f30ef76c6cc21f302282041bdf81de9fc4244/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'product',
        column: col('category', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'product',
        column: col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'product',
        column: col('isPublished', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
