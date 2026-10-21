
import dotenv from "dotenv";
import path from "node:path";
import { Pool } from "pg";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

dotenv.config({
  path: path.resolve(process.cwd(), "../../.env"),
});

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing. Check the root .env file."
  );
}

export const postgresPool = new Pool({
  connectionString: databaseUrl,
});

export async function testPostgresConnection(): Promise<void> {
  const result = await postgresPool.query(
    "SELECT current_database() AS database_name"
  );

  console.log(
    "PostgreSQL connection successful:",
    result.rows[0]
  );
}
