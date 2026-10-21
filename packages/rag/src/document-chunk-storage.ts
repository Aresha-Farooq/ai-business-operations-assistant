
import type { ProcessedChunk } from "./process-document.js";
import { generateEmbedding } from "@business-platform/ai";
import { postgresPool } from "./postgres.js";

export async function saveDocumentChunks(
  chunks: ProcessedChunk[],
): Promise<void> {
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text);
    const vectorString = `[${embedding.join(",")}]`;

    await postgresPool.query(
      `INSERT INTO public."documentChunk"
        (
          "documentId",
          "organizationId",
          "chunkIndex",
          content,
          "documentType",
          source,
          "processedAt",
          "embeddingJson",
          embedding
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)`,
      [
        chunk.documentId,
        chunk.organizationId,
        chunk.index,
        chunk.text,
        chunk.documentType,
        chunk.source,
        chunk.processedAt,
        JSON.stringify(embedding),
        vectorString,
      ],
    );
  }
}

export async function getDocumentChunks(
  organizationId: number,
  documentId: number,
) {
  const result = await postgresPool.query(
    `SELECT
       id,
       "documentId",
       "organizationId",
       "chunkIndex",
       content,
       "documentType",
       source,
       "processedAt"
     FROM public."documentChunk"
     WHERE "organizationId" = $1
       AND "documentId" = $2
     ORDER BY "chunkIndex" ASC`,
    [organizationId, documentId],
  );

  return result.rows;
}

export async function searchSimilarChunks(
  organizationId: number,
  question: string,
  limit: number = 5,
) {
  const queryEmbedding = await generateEmbedding(question);
  const vectorString = `[${queryEmbedding.join(",")}]`;

  const result = await postgresPool.query(
    `SELECT
       id,
       "documentId",
       "organizationId",
       "chunkIndex",
       content,
       source,
       1 - (embedding <=> $1::vector) AS similarity
     FROM public."documentChunk"
     WHERE "organizationId" = $2
       AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vectorString, organizationId, limit],
  );

  return result.rows;
}
