import { searchCustomers } from "./packages/business/search-customers.ts";

try {
  const results = await searchCustomers("Ahmed");
  console.log("Search results:");
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  console.error("Search failed:", error);
  process.exitCode = 1;
}

process.exit();
