import { readFile } from "node:fs/promises";
import { postgresPool } from "./postgres.js";
import { processDocument } from "./process-document.js";
import { saveDocumentChunks } from "./document-chunk-storage.js";
import { answerQuestion } from "./answer-question.js";

async function main() {
  const organizationResult = await postgresPool.query<{ id: number }>(
    `INSERT INTO public.organization (name, "createdAt", "updatedAt")
     VALUES ($1, NOW(), NOW()) RETURNING id`,
    ["Sample Company"],
  );

  const organizationId = organizationResult.rows[0]!.id;
  let documentId: number | undefined;

  try {
    const filePath = "leave-policy.txt";
    const buffer = await readFile(filePath);

    const documentResult = await postgresPool.query<{ id: number }>(
      `INSERT INTO public.document
       ("organizationId", name, "mimeType", "sizeBytes", "storagePath",
        status, "approvalStatus", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id`,
      [
        organizationId,
        filePath,
        "text/plain",
        buffer.length,
        filePath,
        "PROCESSED",
        "APPROVED",
      ],
    );

    documentId = documentResult.rows[0]!.id;

    const processed = await processDocument(
      buffer,
      "text/plain",
      {
        organizationId,
        documentId,
        documentType: "text/plain",
        source: filePath,
      },
    );

    await saveDocumentChunks(processed.chunks);

    const answer = await answerQuestion(
      organizationId,
      "How many annual leaves do employees receive?",
    );

    console.log("RAG answer:", answer);
  } finally {
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

    await postgresPool.query(
      `DELETE FROM public.organization WHERE id = $1`,
      [organizationId],
    );
    await postgresPool.end();
  }
}

main().catch((error) => {
  console.error("RAG flow failed:", error);
  process.exitCode = 1;
});