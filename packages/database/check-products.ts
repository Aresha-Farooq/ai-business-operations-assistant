import "dotenv/config";
import { db, getDbRuntime } from "./index.js";

async function main() {
  const runtime = await getDbRuntime();

  const plan = db.sql.public.product
    .select(
      "id",
      "name",
      "sku",
      "stockQuantity",
      "minimumStock",
      "organizationId"
    )
    .build();

  const products = await runtime.query(plan);

  console.log("Products by organization:");
  console.table(products);
}

main().catch((error) => {
  console.error("Product check failed:", error);
  process.exitCode = 1;
});