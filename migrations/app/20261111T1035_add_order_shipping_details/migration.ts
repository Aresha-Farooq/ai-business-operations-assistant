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
      this.dataTransform(endContract, 'backfill-order-shippingAddress', {
        check: () => placeholder('backfill-order-shippingAddress:check'),
        run: () => placeholder('backfill-order-shippingAddress:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'order', column: 'shippingAddress' }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('shippingCity', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-order-shippingCity', {
        check: () => placeholder('backfill-order-shippingCity:check'),
        run: () => placeholder('backfill-order-shippingCity:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'order', column: 'shippingCity' }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('shippingEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-order-shippingEmail', {
        check: () => placeholder('backfill-order-shippingEmail:check'),
        run: () => placeholder('backfill-order-shippingEmail:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'order', column: 'shippingEmail' }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('shippingName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-order-shippingName', {
        check: () => placeholder('backfill-order-shippingName:check'),
        run: () => placeholder('backfill-order-shippingName:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'order', column: 'shippingName' }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('shippingPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-order-shippingPhone', {
        check: () => placeholder('backfill-order-shippingPhone:check'),
        run: () => placeholder('backfill-order-shippingPhone:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'order', column: 'shippingPhone' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
