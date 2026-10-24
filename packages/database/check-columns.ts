
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const result = await pool.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'documentChunk'
    ORDER BY ordinal_position
  `);

  console.table(result.rows);
}

main()
  .catch(console.error)
  .finally(async () => {
    await pool.end();
  });
