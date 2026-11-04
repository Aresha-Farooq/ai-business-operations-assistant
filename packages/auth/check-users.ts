
import "dotenv/config";


import { db, getDbRuntime } from "@business-platform/database";

async function checkUsers() {
  const runtime = await getDbRuntime();

  const plan = db.sql.public.user
    .select("id", "name", "email", "organizationId", "role")
    .build();

  const users = await runtime.query(plan);

  console.log("Registered users:");
  console.log(users);
}


checkUsers();
