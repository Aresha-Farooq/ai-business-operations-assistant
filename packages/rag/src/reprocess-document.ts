
import { postgresPool } from "./postgres.js";
import { processDocument } from "./process-document.js";
import {
  saveDocumentChunks,
  deleteDocumentChunks,
} from "./document-chunk-storage.js";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const documentId = 37;
  const organizationId = 1;

  try {
    const result = await postgresPool.query(
      `SELECT id, name, "mimeType", "storagePath", status, "approvalStatus"
       FROM public.document
       WHERE id = $1 AND "organizationId" = $2`,
      [documentId, organizationId],
    );

    const document = result.rows[0];

    if (!document || document.approvalStatus !== "APPROVED") {
      throw new Error("Approved document not found for this organization.");
    }

if (
  path.basename(document.storagePath) !== document.storagePath ||
  document.storagePath.includes("..")
) {
  throw new Error("Invalid document storage path.");
}

const filePath = path.resolve(
  "apps/web/.private-storage/documents",
  document.storagePath
);

const buffer = await readFile(filePath);

    const processed = await processDocument(buffer, document.mimeType, {
      documentId,
      organizationId,
      documentType: document.mimeType,
      source: document.name,
    });

    if (
      processed.chunks.length === 0 ||
      !processed.chunks.some((chunk) =>
        chunk.text.includes("Employees receive 20 annual leaves."),
      )
    ) {
      throw new Error(
        "Expected annual-leave text was not found. No existing chunks were deleted.",
      );
    }

    // Generate and validate embeddings before replacing existing chunks.
    const embeddingModule = await import("../../ai/src/embeddings.js");
    for (const chunk of processed.chunks) {
      const embedding = await embeddingModule.generateEmbedding(chunk.text);
      if (!embedding.length || embedding.some((value) => !Number.isFinite(value))) {
        throw new Error("Invalid embedding generated; existing chunks were preserved.");
      }
    }

    await deleteDocumentChunks(documentId, organizationId);
    await saveDocumentChunks(processed.chunks);

    await postgresPool.query(
      `UPDATE public.document
       SET status = 'PROCESSED', "updatedAt" = NOW()
       WHERE id = $1
         AND "organizationId" = $2
         AND "approvalStatus" = 'APPROVED'`,
      [documentId, organizationId],
    );

    console.log("Reprocessing completed.");
    console.log("Chunks saved:", processed.chunks.length);
    console.log("Annual-leave sentence found: true");
  } finally {
    await postgresPool.end();
  }
}

main().catch((error) => {
  console.error("Reprocessing failed:", error);
  process.exitCode = 1;
});
