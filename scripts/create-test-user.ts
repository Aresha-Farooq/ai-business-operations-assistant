import "dotenv/config";
import { db, getDbRuntime } from "../packages/database/index.ts";
import { hashPassword } from "../packages/auth/password.ts";

async function main() {
  const runtime = await getDbRuntime();

  const email = "tenant2-test@example.com";
  const password = "Tenant2Test@2026";

  // Avoid creating the same user twice.
  const existingPlan = db.sql.public.user
    .select("id", "email", "organizationId")
    .where((fields, fns) => fns.eq(fields.email, email))
    .build();

  const existingUsers = await runtime.query(existingPlan);

  if (existingUsers.length > 0) {
    console.log("Test user already exists:", existingUsers[0]);
    return;
  }

  const passwordHash = await hashPassword(password);

  const insertPlan = db.sql.public.user
    .insert([
      {
        name: "Tenant 2 Test User",
        email,
        passwordHash,
        organizationId: 2,
        role: "STAFF",
      },
    ])
    .returning("id", "name", "email", "organizationId", "role")
    .build();

  const users = await runtime.query(insertPlan);

  console.log("Test user created:", users[0]);
}

main().catch((error) => {
  console.error("Failed to create test user:", error);
  process.exitCode = 1;
});