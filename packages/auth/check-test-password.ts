import "dotenv/config";
import { db, getDbRuntime } from "@business-platform/database";
import { verifyPassword } from "./password.js";

async function main() {
  const runtime = await getDbRuntime();

  const plan = db.sql.public.user
    .select("passwordHash")
    .where((fields, fns) =>
      fns.eq(fields.email, "login-test@example.com")
    )
    .build();

  const users = await runtime.query(plan);

  if (users.length === 0) {
    console.log("Test account not found.");
    return;
  }

  const valid = await verifyPassword(
    "TestPassword123",
    users[0].passwordHash
  );

  console.log("Test password matches:", valid);
}

main().catch((error) => {
  console.error("Password check failed:", error);
  process.exitCode = 1;
});
