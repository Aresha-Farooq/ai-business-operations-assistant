import { db, getDbRuntime } from "@business-platform/database";

const runtime = await getDbRuntime();

const plan = db.sql.public.customer
  .select("id", "name", "organizationId", "isActive")
  .where((fields, fns) => fns.eq(fields.organizationId, 1))
  .build();

const customers = await runtime.query(plan);

console.log(JSON.stringify(customers, null, 2));

process.exit(0);
