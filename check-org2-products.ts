import { db, getDbRuntime } from "@business-platform/database";

const runtime = await getDbRuntime();

const plan = db.sql.public.product
  .select("id", "organizationId", "isActive")
  .where((fields, fns) => fns.eq(fields.organizationId, 2))
  .build();

const products = await runtime.query(plan);

console.log(JSON.stringify(products, null, 2));
process.exit(0);
