import "dotenv/config";
import { hashPassword } from "../auth/password.js";
import { db, getDbRuntime } from "./index.js";

async function main() {
  const email = "owner-test@example.com";
  const password = "OwnerTest123!";

  const runtime = await getDbRuntime();

  const existingQuery = db.sql.public.user
    .select("id", "email", "role")
    .where((fields, fns) => fns.eq(fields.email, email))
    .build();

  const existing = await runtime.query(existingQuery);

  if (existing.length > 0) {
    console.log("Owner test account already exists:", existing);
    return;
  }

  const passwordHash = await hashPassword(password);

  const insertQuery = db.sql.public.user
    .insert([{
      name: "Owner Test User",
      email,
      passwordHash,
      organizationId: 1,
      role: "OWNER",
    }])
    .returning("id", "name", "email", "role", "organizationId")
    .build();

  const result = await runtime.query(insertQuery);
  console.log("Owner test account created:", result);
  console.log("Email:", email);
  console.log("Password:", password);
}

main().catch(console.error);
