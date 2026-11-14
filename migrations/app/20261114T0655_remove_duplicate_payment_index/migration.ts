#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8ace320af3cb93b334b64743796bd6c98307dfca19b5b674363be5decc350d8c/contract';
import endContract from '../../snapshots/8ace320af3cb93b334b64743796bd6c98307dfca19b5b674363be5decc350d8c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c909d89c4fab829379d244aee8d70c4440cefa7ccf5084d020fc2f83b3b53f1f/contract';
import startContract from '../../snapshots/c909d89c4fab829379d244aee8d70c4440cefa7ccf5084d020fc2f83b3b53f1f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropIndex({
        schema: 'public',
        table: 'payment',
        index: 'payment_orderid_organizationid_idx_3de541e1',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
