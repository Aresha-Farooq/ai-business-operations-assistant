#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5104d97a9199aa1405f35ff29d64c3e49ae25abb09115088d1e4d915cd744414/contract';
import startContract from '../../snapshots/5104d97a9199aa1405f35ff29d64c3e49ae25abb09115088d1e4d915cd744414/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a57bee347bd7b49064c0bed3f7e1ab01985d8b923f17f617731a12efc0a773ae/contract';
import endContract from '../../snapshots/a57bee347bd7b49064c0bed3f7e1ab01985d8b923f17f617731a12efc0a773ae/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createIndex({
        schema: 'public',
        table: 'product',
        index: 'product_org_sku_unique',
        columns: ['organizationId', 'sku'],
        extras: { where: '("deletedAt" IS NULL)', unique: true },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
