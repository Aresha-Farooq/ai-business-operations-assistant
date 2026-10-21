
import { afterAll, describe, expect, it, vi } from "vitest";
import { postgresPool } from "./postgres.js";
import {
  saveDocumentChunks,
  getDocumentChunks,
} from "./document-chunk-storage.js";
import type { ProcessedChunk } from "./process-document.js";

vi.mock("@business-platform/ai", () => ({
  generateEmbedding: vi.fn(async () => Array(384).fill(0.1)),
}));

describe("document chunk storage integration", () => {
  let organizationId: number | undefined;
  let documentId: number | undefined;

  afterAll(async () => {
    try {
      if (documentId !== undefined) {
        await postgresPool.query(
          `DELETE FROM public."documentChunk" WHERE "documentId" = $1`,
          [documentId],
        );

        await postgresPool.query(
          `DELETE FROM public.document WHERE id = $1`,
          [documentId],
        );
      }

      if (organizationId !== undefined) {
        await postgresPool.query(
          `DELETE FROM public.organization WHERE id = $1`,
          [organizationId],
        );
      }
      
it("does not return chunks belonging to another organization", async () => {
  const result = await postgresPool.query(
    `SELECT id
     FROM public."documentChunk"
     WHERE "organizationId" = $1
       AND "documentId" = $2`,
    [organizationId, documentId],
  );

  expect(result.rows.length).toBeGreaterThan(0);

  const otherOrganizationId = -999;

  const searchResults = await postgresPool.query(
    `SELECT content
     FROM public."documentChunk"
     WHERE "organizationId" = $1
       AND embedding IS NOT NULL`,
    [otherOrganizationId],
  );

  expect(searchResults.rows).toHaveLength(0);
});

    } finally {
      await postgresPool.end();
    }
  });

  it("saves and retrieves a chunk from PostgreSQL", async () => {
    const organizationResult = await postgresPool.query<{ id: number }>(
      `INSERT INTO public.organization
        (name, "createdAt", "updatedAt")
       VALUES ($1, NOW(), NOW())
       RETURNING id`,
      ["RAG Integration Test"],
    );

    const createdOrganization = organizationResult.rows[0];

    if (!createdOrganization) {
      throw new Error("Failed to create test organization");
    }

    organizationId = createdOrganization.id;

    const documentResult = await postgresPool.query<{ id: number }>(
      `INSERT INTO public.document
        (
          "organizationId",
          name,
          "mimeType",
          "sizeBytes",
          "storagePath",
          status,
          "approvalStatus",
          "createdAt",
          "updatedAt"
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id`,
      [
        organizationId,
        "integration-test.txt",
        "text/plain",
        36,
        "integration-test-only",
        "PROCESSED",
        "APPROVED",
      ],
    );

    const createdDocument = documentResult.rows[0];

    if (!createdDocument) {
      throw new Error("Failed to create test document");
    }

    documentId = createdDocument.id;

    const chunk: ProcessedChunk = {
      index: 0,
      text: "Employees receive 20 annual leaves.",
      documentId,
      organizationId,
      documentType: "text/plain",
      source: "integration-test.txt",
      processedAt: new Date().toISOString(),
    };

    await saveDocumentChunks([chunk]);

const searchResults = await postgresPool.query(
  `SELECT
     content,
     1 - (embedding <=> $1::vector) AS similarity
   FROM public."documentChunk"
   WHERE "organizationId" = $2
     AND embedding IS NOT NULL
   ORDER BY embedding <=> $1::vector
   LIMIT $3`,
  [
    `[${Array(384).fill(0.1).join(",")}]`,
    organizationId,
    5,
  ],
);

expect(searchResults.rows.length).toBeGreaterThan(0);
expect(searchResults.rows[0].content).toBe(chunk.text);

    const vectorResult = await postgresPool.query<{
      has_native_embedding: boolean;
      dimensions: number;
    }>(
      `SELECT
         embedding IS NOT NULL AS has_native_embedding,
         vector_dims(embedding) AS dimensions
       FROM public."documentChunk"
       WHERE "organizationId" = $1
         AND "documentId" = $2
         AND "chunkIndex" = $3`,
      [organizationId, documentId, chunk.index],
    );

    expect(vectorResult.rows[0]?.has_native_embedding).toBe(true);
    expect(vectorResult.rows[0]?.dimensions).toBe(384);

    const rows = await getDocumentChunks(organizationId, documentId);

    expect(rows).toHaveLength(1);
    expect(rows[0].content).toBe(chunk.text);
    expect(rows[0].organizationId).toBe(organizationId);
    expect(rows[0].documentId).toBe(documentId);
  }, 120_000);
});
