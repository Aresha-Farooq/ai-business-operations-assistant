
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDocumentChunks,
  saveDocumentChunks,
  searchSimilarChunks,
} from "./document-chunk-storage.js";
const { queryMock, generateEmbeddingMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  generateEmbeddingMock: vi.fn(),
}));

vi.mock("@business-platform/ai", () => ({
  generateEmbedding: generateEmbeddingMock,
}));

vi.mock("./postgres.js", () => ({
  postgresPool: {
    query: queryMock,
  },
}));

import type { ProcessedChunk } from "./process-document.js";

const sampleChunk: ProcessedChunk = {
  index: 0,
  text: "Employees receive 20 annual leaves.",
  documentId: 10,
  organizationId: 5,
  documentType: "text/plain",
  source: "leave-policy.txt",
  processedAt: "2026-10-14T06:00:00.000Z",
};

describe("document chunk storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateEmbeddingMock.mockResolvedValue(Array(384).fill(0.1));
    queryMock.mockResolvedValue({ rows: [] });
  });

  it("saves each chunk", async () => {
    await saveDocumentChunks([
      sampleChunk,
      { ...sampleChunk, index: 1, text: "Second chunk" },
    ]);

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(generateEmbeddingMock).toHaveBeenCalledTimes(2);
  });

  it("does nothing for an empty chunk list", async () => {
    await saveDocumentChunks([]);

    expect(queryMock).not.toHaveBeenCalled();
    expect(generateEmbeddingMock).not.toHaveBeenCalled();
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(saveDocumentChunks([sampleChunk])).rejects.toThrow(
      "Database unavailable",
    );

  });

  it("queries chunks for the requested organization and document", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: 1, content: sampleChunk.text }],
    });

    const rows = await getDocumentChunks(5, 10);

    expect(rows).toHaveLength(1);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });
  
  it("searches chunks using vector similarity and organization isolation", async () => {
    const matchingChunk = {
      id: 1,
      documentId: 10,
      organizationId: 5,
      chunkIndex: 0,
      content: "Employees receive 20 annual leaves.",
      source: "leave-policy.txt",
      similarity: 0.95,
    };

    queryMock.mockResolvedValueOnce({
      rows: [matchingChunk],
    });

    const results = await searchSimilarChunks(
      5,
      "How many annual leaves do employees get?",
      3,
    );

    expect(generateEmbeddingMock).toHaveBeenCalledWith(
      "How many annual leaves do employees get?",
    );

    expect(queryMock).toHaveBeenCalledTimes(1);

    const [sql, params] = queryMock.mock.calls[0]!;

    expect(sql).toContain('"organizationId" = $2');
    expect(sql).toContain("embedding <=> $1::vector");
    expect(sql).toContain("ORDER BY embedding <=> $1::vector");
    expect(params).toEqual([
      `[${Array(384).fill(0.1).join(",")}]`,
      5,
      3,
    ]);

    expect(results).toEqual([matchingChunk]);
  });

  it("returns an empty array when no chunks match", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const results = await searchSimilarChunks(
      5,
      "A question without matching documents",
    );

    expect(results).toEqual([]);
  });

});
