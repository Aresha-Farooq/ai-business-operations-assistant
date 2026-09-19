import "dotenv/config";
import { db } from "@business-platform/database";

async function checkUsers() {
  const runtime = await db.connect({
    url: process.env["DATABASE_URL"]!,
  });

  const plan = db.sql.public.user
    .select("id", "name", "email", "organizationId", "role")
    .build();

  const users = await runtime.query(plan);

  console.log("Registered users:");
  console.log(users);
}

checkUsers();