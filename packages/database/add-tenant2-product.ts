import "dotenv/config";
import { db, getDbRuntime } from "./index.js";

async function main() {
  const runtime = await getDbRuntime();

 const existingPlan = db.sql.public.product
  .select("id", "sku", "organizationId")
  .where((fields, fns) =>
    fns.and(
      fns.eq(fields.organizationId, 2),
      fns.eq(fields.sku, "TENANT2-TEST-001")
    )
  )
  .build();
  const existing = await runtime.query(existingPlan);

  if (existing.length > 0) {
    console.log("Test product already exists:", existing);
    return;
  }

  const plan = db.sql.public.product
    .insert([
      {
        name: "Organization 2 Test Product",
        sku: "TENANT2-TEST-001",
        purchasePrice: 100,
        salePrice: 150,
        stockQuantity: 1,
        minimumStock: 5,
        organizationId: 2,
      },
    ])
    .returning(
      "id",
      "name",
      "sku",
      "stockQuantity",
      "minimumStock",
      "organizationId"
    )
    .build();

  console.log("Created:", await runtime.query(plan));
}

main().catch((error) => {
  console.error("Failed to create test product:", error);
  process.exitCode = 1;
});