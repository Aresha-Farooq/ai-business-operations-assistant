#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5104d97a9199aa1405f35ff29d64c3e49ae25abb09115088d1e4d915cd744414/contract';
import endContract from '../../snapshots/5104d97a9199aa1405f35ff29d64c3e49ae25abb09115088d1e4d915cd744414/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/577c1c0faa0b236a7a76c0f670cf0c27f757caa3d9643becfdec3a976adb7653/contract';
import startContract from '../../snapshots/577c1c0faa0b236a7a76c0f670cf0c27f757caa3d9643becfdec3a976adb7653/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'auditLog',
        column: col('source', 'text', {
          notNull: true,
          default: lit('SYSTEM'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'auditLog',
        constraint: 'auditLog_source_check_f7d4fa33',
        expression: "\"source\" IN ('BUSINESS_API', 'MCP', 'AUTH', 'SYSTEM')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
