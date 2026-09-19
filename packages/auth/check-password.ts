import "dotenv/config";
import { db } from "@business-platform/database";
import { verifyPassword } from "./password";

async function checkPassword() {
  const runtime = await db.connect({
    url: process.env["DATABASE_URL"]!,
  });

  const plan = db.sql.public.user
    .select("email", "passwordHash")
    .where((fields, fns) =>
      fns.eq(fields.email, "login-test@example.com")
    )
    .build();

  const users = await runtime.query(plan);

  if (users.length === 0) {
    console.log("User not found.");
    return;
  }

  const isValid = await verifyPassword(
    "TestPassword123",
    users[0].passwordHash
  );

  console.log("Password matches:", isValid);
}

checkPassword();