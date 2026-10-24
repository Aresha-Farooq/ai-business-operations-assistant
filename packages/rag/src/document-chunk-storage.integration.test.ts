
import { afterAll, describe, expect, it, vi } from "vitest";
import { postgresPool } from "./postgres.js";
import {
  saveDocumentChunks,
  getDocumentChunks,
  searchSimilarChunks,
} from "./document-chunk-storage.js";
import type { ProcessedChunk } from "./process-document.js";

vi.mock("../../ai/src/embeddings.js", () => ({
  generateEmbedding: vi.fn(async () => Array(384).fill(0.1)),
}));

describe("document chunk storage integration", () => {
  const organizationIds: number[] = [];
  const documentIds: number[] = [];

  afterAll(async () => {
    try {
      for (const documentId of documentIds) {
        await postgresPool.query(
          `DELETE FROM public."documentChunk"
           WHERE "documentId" = $1`,
          [documentId],
        );

        await postgresPool.query(
          `DELETE FROM public.document WHERE id = $1`,
          [documentId],
        );
      }

      for (const organizationId of organizationIds) {
        await postgresPool.query(
          `DELETE FROM public.organization WHERE id = $1`,
          [organizationId],
        );
      }
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

    const organization = organizationResult.rows[0];
    if (!organization) {
      throw new Error("Failed to create test organization");
    }

    organizationIds.push(organization.id);

    const documentResult = await postgresPool.query<{ id: number }>(
      `INSERT INTO public.document
        (
          "organizationId", name, "mimeType", "sizeBytes",
          "storagePath", status, "approvalStatus",
          "createdAt", "updatedAt"
        )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id`,
      [
        organization.id,
        "integration-test.txt",
        "text/plain",
        36,
        "integration-test-only",
        "PROCESSED",
        "APPROVED",
      ],
    );

    const document = documentResult.rows[0];
    if (!document) {
      throw new Error("Failed to create test document");
    }

    documentIds.push(document.id);

    const chunk: ProcessedChunk = {
      index: 0,
      text: "Employees receive 20 annual leaves.",
      documentId: document.id,
      organizationId: organization.id,
      documentType: "text/plain",
      source: "integration-test.txt",
      processedAt: new Date().toISOString(),
    };

    await saveDocumentChunks([chunk]);

    const results = await searchSimilarChunks(
      organization.id,
      "How many annual leaves do employees receive?",
      5,
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toBe(chunk.text);
    expect(results[0].similarity).toBeDefined();
    expect(results[0].documentType).toBe("text/plain");

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
      [organization.id, document.id, chunk.index],
    );

    expect(vectorResult.rows[0]?.has_native_embedding).toBe(true);
    expect(vectorResult.rows[0]?.dimensions).toBe(384);

    const rows = await getDocumentChunks(organization.id, document.id);

    expect(rows).toHaveLength(1);
    expect(rows[0].content).toBe(chunk.text);
    expect(rows[0].organizationId).toBe(organization.id);
    expect(rows[0].documentId).toBe(document.id);
  }, 120_000);

  it("does not return chunks belonging to another organization", async () => {
    const createOrganization = async (name: string) => {
      const result = await postgresPool.query<{ id: number }>(
        `INSERT INTO public.organization
          (name, "createdAt", "updatedAt")
         VALUES ($1, NOW(), NOW())
         RETURNING id`,
        [name],
      );

      const organization = result.rows[0];
      if (!organization) {
        throw new Error(`Failed to create organization: ${name}`);
      }

      organizationIds.push(organization.id);
      return organization.id;
    };

    const createDocument = async (
      organizationId: number,
      name: string,
    ) => {
      const result = await postgresPool.query<{ id: number }>(
        `INSERT INTO public.document
          (
            "organizationId", name, "mimeType", "sizeBytes",
            "storagePath", status, "approvalStatus",
            "createdAt", "updatedAt"
          )
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id`,
        [
          organizationId,
          name,
          "text/plain",
          36,
          `integration-test-${name}`,
          "PROCESSED",
          "APPROVED",
        ],
      );

      const document = result.rows[0];
      if (!document) {
        throw new Error(`Failed to create document: ${name}`);
      }

      documentIds.push(document.id);
      return document.id;
    };

    const organizationA = await createOrganization(
      "RAG Isolation Test A",
    );
    const organizationB = await createOrganization(
      "RAG Isolation Test B",
    );

    const documentA = await createDocument(
      organizationA,
      "isolation-a.txt",
    );
    const documentB = await createDocument(
      organizationB,
      "isolation-b.txt",
    );

    const createChunk = (
      organizationId: number,
      documentId: number,
      text: string,
      source: string,
    ): ProcessedChunk => ({
      index: 0,
      text,
      documentId,
      organizationId,
      documentType: "text/plain",
      source,
      processedAt: new Date().toISOString(),
    });

    await saveDocumentChunks([
      createChunk(
        organizationA,
        documentA,
        "Organization A has 20 annual leaves.",
        "isolation-a.txt",
      ),
      createChunk(
        organizationB,
        documentB,
        "Organization B has 30 annual leaves.",
        "isolation-b.txt",
      ),
    ]);

    const results = await searchSimilarChunks(
      organizationA,
      "How many annual leaves are available?",
      10,
    );

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (result) => Number(result.organizationId) === organizationA,
      ),
    ).toBe(true);

    expect(
      results.some((result) =>
        String(result.content).includes("Organization A"),
      ),
    ).toBe(true);

    expect(
      results.some((result) =>
        String(result.content).includes("Organization B"),
      ),
    ).toBe(false);
  }, 120_000);
});
