import { db, getDbRuntime } from "@business-platform/database";

const runtime = await getDbRuntime();

const plan = db.sql.public.organization
  .select("id")
  .build();

const organizations = await runtime.query(plan);

console.log(JSON.stringify(organizations, null, 2));

process.exit(0);
