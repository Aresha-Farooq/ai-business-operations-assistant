
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

export type DocumentProcessingStage =
  | "extracting"
  | "chunking"
  | "completed";

export interface DocumentProcessingProgress {
  stage: DocumentProcessingStage;
  message: string;
  completed?: number;
  total?: number;
}

export type DocumentProgressCallback = (
  progress: DocumentProcessingProgress,
) => void;

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
  onProgress?: DocumentProgressCallback,
): Promise<ProcessedDocument> {
  onProgress?.({
    stage: "extracting",
    message: "Extracting document text",
  });

  const extracted = await extractDocument(
    buffer,
    mimeType,
    context.source,
  );

  onProgress?.({
    stage: "chunking",
    message: "Splitting extracted text into chunks",
  });

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

  onProgress?.({
    stage: "completed",
    message: "Text extraction and chunking completed",
    completed: chunks.length,
    total: chunks.length,
  });

  return { extracted, chunks };
}
