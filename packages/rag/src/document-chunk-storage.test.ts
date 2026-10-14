
import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("@business-platform/ai", () => ({
  generateEmbedding: vi.fn().mockResolvedValue([
    0.12,
    -0.38,
    0.71,
  ]),
}));
const { queryMock, getDbRuntimeMock, buildMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  getDbRuntimeMock: vi.fn(),
  buildMock: vi.fn(() => ({ kind: "query" })),
}));

vi.mock("@business-platform/database", () => ({
  db: {
    sql: {
      public: {
        documentChunk: {
          insert: vi.fn(() => ({
            returning: vi.fn(() => ({
              build: buildMock,
            })),
          })),
          select: vi.fn(() => ({
            where: vi.fn(() => ({
              build: buildMock,
            })),
          })),
        },
      },
    },
  },
  getDbRuntime: getDbRuntimeMock,
}));

import {
  getDocumentChunks,
  saveDocumentChunks,
} from "./document-chunk-storage.js";
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
    getDbRuntimeMock.mockResolvedValue({ query: queryMock });
    queryMock.mockResolvedValue([]);
  });

  it("saves each chunk", async () => {
    await saveDocumentChunks([
      sampleChunk,
      { ...sampleChunk, index: 1, text: "Second chunk" },
    ]);

    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("does nothing for an empty chunk list", async () => {
    await saveDocumentChunks([]);

    expect(getDbRuntimeMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("propagates database errors", async () => {
    queryMock.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(saveDocumentChunks([sampleChunk])).rejects.toThrow(
      "Database unavailable",
    );
  });

  it("queries chunks for the requested organization and document", async () => {
    await getDocumentChunks(5, 10);

    expect(queryMock).toHaveBeenCalledTimes(1);
  });
});
