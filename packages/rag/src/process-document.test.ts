
import { describe, expect, it } from "vitest";
import { processDocument } from "./process-document.js";

describe("processDocument", () => {
  it("extracts text, chunks it, and attaches metadata", async () => {
    const buffer = Buffer.from(
      "Company leave policy. ".repeat(20),
    );

    const result = await processDocument(
      buffer,
      "text/plain",
      {
        documentId: 10,
        organizationId: 5,
        documentType: "text/plain",
        source: "leave-policy.txt",
      },
      {
        chunkSize: 100,
        overlap: 20,
      },
    );

    expect(result.extracted.text.length).toBeGreaterThan(0);
    expect(result.chunks.length).toBeGreaterThan(1);

    expect(result.chunks[0]).toMatchObject({
      index: 0,
      documentId: 10,
      organizationId: 5,
      documentType: "text/plain",
      source: "leave-policy.txt",
    });

    expect(
      Number.isNaN(Date.parse(result.chunks[0]!.processedAt)),
    ).toBe(false);
  });

  it("returns no chunks for an empty text document", async () => {
    const result = await processDocument(
      Buffer.from(""),
      "text/plain",
      {
        documentId: 11,
        organizationId: 5,
        documentType: "text/plain",
        source: "empty.txt",
      },
    );

    expect(result.chunks).toEqual([]);
  });
});
