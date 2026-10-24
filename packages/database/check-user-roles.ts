import "dotenv/config";
import { db, getDbRuntime } from "./index.js";

async function main() {
  const runtime = await getDbRuntime();
  const query = db.sql.public.user
    .select("id", "name", "email", "role", "organizationId")
    .build();

  const users = await runtime.query(query);
  console.table(users.map(({ id, name, role, organizationId }) => ({
    id, name, role, organizationId
  })));
}

main().catch(console.error);
