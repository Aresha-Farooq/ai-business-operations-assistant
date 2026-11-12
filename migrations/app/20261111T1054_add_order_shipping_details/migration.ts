#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5e0ea89884786b7bd2de0ffee419e46a944792b1ba668fe00ca45e3bdd3f0446/contract';
import startContract from '../../snapshots/5e0ea89884786b7bd2de0ffee419e46a944792b1ba668fe00ca45e3bdd3f0446/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c909d89c4fab829379d244aee8d70c4440cefa7ccf5084d020fc2f83b3b53f1f/contract';
import endContract from '../../snapshots/c909d89c4fab829379d244aee8d70c4440cefa7ccf5084d020fc2f83b3b53f1f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('deliveryInstructions', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('shippingAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('shippingCity', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('shippingEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('shippingName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('shippingPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
