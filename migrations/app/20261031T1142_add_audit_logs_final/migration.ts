#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/577c1c0faa0b236a7a76c0f670cf0c27f757caa3d9643becfdec3a976adb7653/contract';
import endContract from '../../snapshots/577c1c0faa0b236a7a76c0f670cf0c27f757caa3d9643becfdec3a976adb7653/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d876971fab0f4c50e64e6f82a5651e5f9556092caaf9e21cf051494913bfe168/contract';
import startContract from '../../snapshots/d876971fab0f4c50e64e6f82a5651e5f9556092caaf9e21cf051494913bfe168/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'auditLog',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('errorMessage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('organizationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('toolName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'auditLog_status_check_13e3e34e',
            "\"status\" IN ('SUCCESS', 'FAILURE', 'DENIED')",
          ),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_organizationId_createdAt_idx_c52d1cc3',
        columns: ['organizationId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_organizationId_idx_2e17ef41',
        columns: ['organizationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_organizationId_toolName_idx_3427dd08',
        columns: ['organizationId', 'toolName'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_organizationId_userId_idx_28366c8d',
        columns: ['organizationId', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auditLog',
        foreignKey: {
          name: 'auditLog_organizationId_fkey',
          columns: ['organizationId'],
          references: { schema: 'public', table: 'organization', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auditLog',
        foreignKey: {
          name: 'auditLog_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
