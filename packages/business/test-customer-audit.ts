
import {
  createCustomer,
  getCustomers,
} from "./customer.js";

async function main() {
  console.log("Creating test customer...");

  const customer = await createCustomer({
    name: "Audit Test Customer",
    email: `audit-test-${Date.now()}@example.com`,
    phone: "03001234567",
  });

  console.log("Customer created successfully:");
  console.log(customer);

  console.log("\nChecking customers in current organization...");

  const customers = await getCustomers();

  console.log(
    "Customer found:",
    customers.some((item) => item.id === customer.id)
  );
}

main().catch((error) => {
  console.error("Customer audit test failed:", error);
  process.exitCode = 1;
});
