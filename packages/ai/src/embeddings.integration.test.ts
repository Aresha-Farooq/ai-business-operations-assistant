
import { describe, expect, it } from "vitest";
import { generateEmbedding } from "./embeddings.js";

describe("local embedding model", () => {
  it("generates a real 384-dimensional embedding", async () => {
    const vector = await generateEmbedding(
      "Employees receive 20 annual leaves."
    );

    expect(vector).toHaveLength(384);
    expect(vector.every(Number.isFinite)).toBe(true);
  }, 120_000);
});
