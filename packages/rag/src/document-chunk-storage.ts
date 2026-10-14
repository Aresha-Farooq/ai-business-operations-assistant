import { db, getDbRuntime } from "@business-platform/database";
import type { ProcessedChunk } from "./process-document.js";
import { generateEmbedding } from "@business-platform/ai";
export async function saveDocumentChunks(
  chunks: ProcessedChunk[]
): Promise<void> {
  if (chunks.length === 0) return;

  const runtime = await getDbRuntime();

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text);
    const query = db.sql.public.documentChunk
      .insert([
        {
            
embeddingJson: JSON.stringify(embedding),
          documentId: chunk.documentId,
          organizationId: chunk.organizationId,
          chunkIndex: chunk.index,
          content: chunk.text,
          documentType: chunk.documentType,
          source: chunk.source,
          processedAt: chunk.processedAt,
        },
      ])
      .returning("id")
      .build();

    await runtime.query(query);
  }
}

export async function getDocumentChunks(
  organizationId: number,
  documentId: number
) {
  const runtime = await getDbRuntime();

  const query = db.sql.public.documentChunk
    .select(
      "id",
      "documentId",
      "organizationId",
      "chunkIndex",
      "content",
      "documentType",
      "source",
      "processedAt"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.organizationId, organizationId),
        fns.eq(fields.documentId, documentId)
      )
    )
    .build();

  return runtime.query(query);
}
