import "dotenv/config";
import { db, getDbRuntime } from "./index.js";

async function checkBusinessData() {
  const runtime = await getDbRuntime();

  const customersPlan = db.sql.public.customer
    .select("id", "name", "organizationId")
    .build();

  const productsPlan = db.sql.public.product
    .select("id", "name", "salePrice", "organizationId")
    .build();

  const customers = await runtime.query(customersPlan);
  const products = await runtime.query(productsPlan);

  console.log("Customers:");
  console.dir(customers, { depth: null });

  console.log("\nProducts:");
  console.dir(products, { depth: null });
}

checkBusinessData();