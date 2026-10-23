import "dotenv/config";
import { db, getDbRuntime } from "@business-platform/database";

async function main() {
  const runtime = await getDbRuntime();

  const plan = db.sql.public.user
    .select("id", "name", "email", "organizationId", "role")
    .where((fields, fns) =>
      fns.eq(fields.email, "login-test@example.com")
    )
    .build();

  const users = await runtime.query(plan);
  console.log("Test account:", users);
}

main().catch((error) => {
  console.error("Diagnostic failed:", error);
  process.exitCode = 1;
});
