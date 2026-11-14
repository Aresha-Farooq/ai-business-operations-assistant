#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5e0ea89884786b7bd2de0ffee419e46a944792b1ba668fe00ca45e3bdd3f0446/contract';
import startContract from '../../snapshots/5e0ea89884786b7bd2de0ffee419e46a944792b1ba668fe00ca45e3bdd3f0446/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d3e87eef0847fa9b37296e6c83f108b234a9330f93b3c3df8640d5f411335624/contract';
import endContract from '../../snapshots/d3e87eef0847fa9b37296e6c83f108b234a9330f93b3c3df8640d5f411335624/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, placeholder } from '@prisma/orm-postgres/migration';

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
