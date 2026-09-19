import "dotenv/config";
import { db } from "./index.js";

async function testDatabase() {
  const runtime = await db.connect({
    url: process.env["DATABASE_URL"]!,
  });

  const plan = db.sql.public.organization
    .select("id", "name")
    .build();

  const organizations = await runtime.query(plan);

  console.log("Organizations:", organizations);
}

testDatabase();