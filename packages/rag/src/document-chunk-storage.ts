
import type { ProcessedChunk } from "./process-document.js";
async function generateEmbedding(text: string): Promise<number[]> {
  const { generateEmbedding } = await import(
    "../../ai/src/embeddings.js"
  );

  return generateEmbedding(text);
}
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
  filters: {
    documentId?: number;
    documentType?: string;
  } = {},
) {
  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    throw new Error("A valid organization ID is required.");
  }

  if (!question.trim()) {
    throw new Error("Question cannot be empty.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error(
      "Retrieval limit must be an integer between 1 and 100.",
    );
  }

  if (
    filters.documentId !== undefined &&
    (!Number.isInteger(filters.documentId) || filters.documentId <= 0)
  ) {
    throw new Error("A valid document ID is required.");
  }

  if (
    filters.documentType !== undefined &&
    !filters.documentType.trim()
  ) {
    throw new Error("Document type cannot be empty.");
  }
const retrievalStartedAt = performance.now();
  const queryEmbedding = await generateEmbedding(question);
  const vectorString = `[${queryEmbedding.join(",")}]`;

  const conditions = [
    '"organizationId" = $2',
    "embedding IS NOT NULL",
  ];

  const params: (string | number)[] = [
    vectorString,
    organizationId,
  ];

  if (filters.documentId !== undefined) {
    params.push(filters.documentId);
    conditions.push(`"documentId" = $${params.length}`);
  }

  if (filters.documentType !== undefined) {
    params.push(filters.documentType.trim());
    conditions.push(`"documentType" = $${params.length}`);
  }

  params.push(limit);

  const result = await postgresPool.query(
    `SELECT
       id,
       "documentId",
       "organizationId",
       "chunkIndex",
       content,
       "documentType",
       source,
       "processedAt",
       1 - (embedding <=> $1::vector) AS similarity
     FROM public."documentChunk"
     WHERE ${conditions.join(" AND ")}
     ORDER BY embedding <=> $1::vector
     LIMIT $${params.length}`,
    params,
  );

const retrievalLatencyMs = performance.now() - retrievalStartedAt;

console.info("Semantic retrieval completed", {
  organizationId,
  resultCount: result.rows.length,
  retrievalLatencyMs: Number(retrievalLatencyMs.toFixed(2)),
});

return result.rows;
}


export async function searchExactChunks(
  organizationId: number,
  searchText: string,
  limit: number = 10,
) {
  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    throw new Error("A valid organization ID is required.");
  }

  if (!searchText.trim()) {
    throw new Error("Search text cannot be empty.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error(
      "Search limit must be an integer between 1 and 100.",
    );
  }

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
       AND POSITION($2 IN content) > 0
     ORDER BY "documentId" ASC, "chunkIndex" ASC
     LIMIT $3`,
    [organizationId, searchText.trim(), limit],
  );

  return result.rows;
}

export async function deleteDocumentChunks(
  documentId: number,
  organizationId: number,
): Promise<void> {
  await postgresPool.query(
    `DELETE FROM public."documentChunk"
     WHERE "documentId" = $1
       AND "organizationId" = $2`,
    [documentId, organizationId],
  );
}
