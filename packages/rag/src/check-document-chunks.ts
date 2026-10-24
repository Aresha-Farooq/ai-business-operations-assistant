import { postgresPool } from "./postgres.js";

async function main() {
  try {
    const result = await postgresPool.query(
      `SELECT
         d.id AS document_id,
         d.name,
         d.status,
         d."approvalStatus" AS approval_status,
         COUNT(c.id)::int AS chunk_count,
         COUNT(c.embedding)::int AS embedded_chunk_count,
         MIN(vector_dims(c.embedding)) AS embedding_dimensions
       FROM public.document d
       LEFT JOIN public."documentChunk" c
         ON c."documentId" = d.id
        AND c."organizationId" = d."organizationId"
       WHERE d.id = $1
         AND d."organizationId" = $2
       GROUP BY d.id, d.name, d.status, d."approvalStatus"`,
      [37, 1],
    );

    console.log("Document indexing diagnostic:");
    console.dir(result.rows, { depth: null });

    const chunks = await postgresPool.query(
      `SELECT
         "chunkIndex",
         content,
         embedding IS NOT NULL AS has_embedding
       FROM public."documentChunk"
       WHERE "documentId" = $1
         AND "organizationId" = $2
       ORDER BY "chunkIndex"`,
      [37, 1],
    );

    console.log("Stored chunks:");
    console.dir(chunks.rows, { depth: null });
  } finally {
    await postgresPool.end();
  }
}

main().catch((error) => {
  console.error("Diagnostic failed:", error);
  process.exitCode = 1;
});