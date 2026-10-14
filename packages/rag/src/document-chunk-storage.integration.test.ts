import { afterAll, describe, expect, it } from "vitest";
import { db, getDbRuntime } from "@business-platform/database";
import {
  saveDocumentChunks,
  getDocumentChunks,
} from "./document-chunk-storage.js";
import type { ProcessedChunk } from "./process-document.js";

describe("document chunk storage integration", () => {
  let organizationId: number | undefined;
  let documentId: number | undefined;

  afterAll(async () => {
    const runtime = await getDbRuntime();

    if (documentId !== undefined) {
      const deleteDocument = db.sql.public.document
        .delete()
        .where((fields, fns) => fns.eq(fields.id, documentId!))
        .build();

      await runtime.query(deleteDocument);
    }

    if (organizationId !== undefined) {
      const deleteOrganization = db.sql.public.organization
        .delete()
        .where((fields, fns) => fns.eq(fields.id, organizationId!))
        .build();

      await runtime.query(deleteOrganization);
    }
  });

  it("saves and retrieves a chunk from PostgreSQL", async () => {
    const runtime = await getDbRuntime();

    const organizationPlan = db.sql.public.organization
      .insert([{ name: "RAG Integration Test" }])
      .returning("id")
      .build();

    const organizations = await runtime.query(organizationPlan);
    const createdOrganization = organizations[0];

    if (!createdOrganization) {
      throw new Error("Failed to create test organization");
    }

    organizationId = createdOrganization.id;

    const documentPlan = db.sql.public.document
      .insert([
        {
          organizationId: createdOrganization.id,
          name: "integration-test.txt",
          mimeType: "text/plain",
          sizeBytes: 36,
          storagePath: "integration-test-only",
          status: "PROCESSED",
          approvalStatus: "APPROVED",
        },
      ])
      .returning("id")
      .build();

    const documents = await runtime.query(documentPlan);
    const createdDocument = documents[0];

    if (!createdDocument) {
      throw new Error("Failed to create test document");
    }

    documentId = createdDocument.id;

    const chunk: ProcessedChunk = {
      index: 0,
      text: "Employees receive 20 annual leaves.",
      documentId: createdDocument.id,
      organizationId: createdOrganization.id,
      documentType: "text/plain",
      source: "integration-test.txt",
      processedAt: new Date().toISOString(),
    };

    await saveDocumentChunks([chunk]);

    const rows = await getDocumentChunks(
      createdOrganization.id,
      createdDocument.id
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].content).toBe(chunk.text);
    expect(rows[0].organizationId).toBe(createdOrganization.id);
    expect(rows[0].documentId).toBe(createdDocument.id);
 }, 120_000);
});
