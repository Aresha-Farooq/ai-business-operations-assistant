import "dotenv/config";
import { postgresPool } from "./src/postgres.js";

async function main() {
  const result = await postgresPool.query(`
    SELECT
      COUNT(*)::int AS total_chunks,
      COUNT(embedding)::int AS chunks_with_embeddings
    FROM public."documentChunk"
    WHERE "organizationId" = $1
  `, [1]);

  console.log("RAG data:", result.rows);
}

main()
  .catch((error) => {
    console.error("RAG diagnostic failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await postgresPool.end();
  });