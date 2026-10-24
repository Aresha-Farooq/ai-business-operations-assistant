import "dotenv/config";
import { db, getDbRuntime } from "./index.js";

async function main() {
  const runtime = await getDbRuntime();

  const organizationsQuery = db.sql.public.organization
    .select("id", "name", "slug")
    .build();

  const usersQuery = db.sql.public.user
    .select("id", "name", "email", "role", "organizationId")
    .build();

  console.log("Organizations:");
  console.table(await runtime.query(organizationsQuery));

  console.log("Users:");
  console.table(await runtime.query(usersQuery));
}

main().catch(console.error);
