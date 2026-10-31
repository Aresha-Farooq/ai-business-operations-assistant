import "dotenv/config";
import { hashPassword } from "../auth/password.js";
import { db, getDbRuntime } from "./index.js";

async function main() {
  const email = "staff-test@example.com";
  const password = "StaffTest123!";

  const runtime = await getDbRuntime();

  // Fetch existing users
  const query = db.sql.public.user
    .select("id", "email", "role")
    .build();

  const users = await runtime.query(query);

  const existing = users.find((user) => user.email === email);

  if (existing) {
    console.log("STAFF test account already exists:", existing);
    return;
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create STAFF account
  const insertQuery = db.sql.public.user
    .insert([{
      name: "Staff Test User",
      email,
      passwordHash,
      organizationId: 1,
      role: "STAFF",
    }])
    .returning("id", "name", "email", "role", "organizationId")
    .build();

  const result = await runtime.query(insertQuery);

  console.log("STAFF test account created:", result);
}

main().catch(console.error);