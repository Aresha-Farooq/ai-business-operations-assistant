import { db, getDbRuntime } from "@business-platform/database";

const runtime = await getDbRuntime();

const plan = db.sql.public.customer
  .select("id", "name", "organizationId", "isActive")
  .build();

const customers = await runtime.query(plan);

const summary = Object.groupBy(customers, (customer) =>
  String(customer.organizationId)
);

console.log(
  JSON.stringify(
    Object.entries(summary).map(([organizationId, records]) => ({
      organizationId,
      customerCount: records.length,
      activeCustomerIds: records
        .filter((customer) => customer.isActive)
        .map((customer) => customer.id),
    })),
    null,
    2
  )
);

process.exit(0);
