import { describe, expect, it, vi } from "vitest";
import { generateEmbedding } from "./embeddings.js";

describe("generateEmbedding", () => {
  it("returns the vector from the provider", async () => {
    const vector = Array(384).fill(0.12);
    const provider = {
      embed: vi.fn().mockResolvedValue(vector),
    };

    const result = await generateEmbedding(
      "  Annual leave policy  ",
      provider
    );

    expect(provider.embed).toHaveBeenCalledWith("Annual leave policy");
    expect(result).toEqual(vector);
  });

  it("rejects empty text", async () => {
    const provider = { embed: vi.fn() };

    await expect(generateEmbedding("  ", provider)).rejects.toThrow(
      "Cannot generate an embedding for empty text."
    );

    expect(provider.embed).not.toHaveBeenCalled();
  });

  it("rejects invalid vectors", async () => {
    const provider = {
      embed: vi.fn().mockResolvedValue([0.1, Number.NaN]),
    };

    await expect(
      generateEmbedding("Annual leave policy", provider)
    ).rejects.toThrow("Embedding provider returned an invalid vector.");
  });
});
