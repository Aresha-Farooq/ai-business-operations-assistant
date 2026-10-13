
import type { ExtractedDocument } from "./types.js";
import { extractDocument } from "./extract-document.js";
import {
  splitTextIntoChunks,
  type ChunkOptions,
  type TextChunk,
} from "./chunk-text.js";

export interface ChunkContext {
  documentId: number;
  organizationId: number;
  documentType: string;
  source: string;
}

export interface ProcessedChunk extends TextChunk {
  documentId: number;
  organizationId: number;
  documentType: string;
  source: string;
  processedAt: string;
}

export interface ProcessedDocument {
  extracted: ExtractedDocument;
  chunks: ProcessedChunk[];
}

export async function processDocument(
  buffer: Buffer,
  mimeType: string,
  context: ChunkContext,
  chunkOptions: ChunkOptions = {},
): Promise<ProcessedDocument> {
  const extracted = await extractDocument(
    buffer,
    mimeType,
    context.source,
  );

  const textChunks = splitTextIntoChunks(
    extracted.text,
    chunkOptions,
  );

  const chunks: ProcessedChunk[] = textChunks.map((chunk) => ({
    ...chunk,
    documentId: context.documentId,
    organizationId: context.organizationId,
    documentType: context.documentType,
    source: context.source,
    processedAt: new Date().toISOString(),
  }));

  return { extracted, chunks };
}
