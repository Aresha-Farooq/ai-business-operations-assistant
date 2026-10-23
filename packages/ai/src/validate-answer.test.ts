
import { describe, it, expect, vi, beforeEach } from "vitest";

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: generateContentMock,
    },
  })),
}));

import { validateAnswer } from "./validate-answer.js";

describe("validateAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env["GEMINI_API_KEY"] = "test-api-key";
  });

  it("accepts a grounded answer", async () => {
    generateContentMock.mockResolvedValue({
      text: '{"isGrounded":true,"reason":"Supported by the policy."}',
    });

    const result = await validateAnswer(
      "How many annual leaves?",
      ["Employees receive 20 annual leaves."],
      "Employees receive 20 annual leaves.",
    );

    expect(result.isGrounded).toBe(true);
  });

  it("rejects an unsupported answer", async () => {
    generateContentMock.mockResolvedValue({
      text: '{"isGrounded":false,"reason":"The policy says 20, not 30."}',
    });

    const result = await validateAnswer(
      "How many annual leaves?",
      ["Employees receive 20 annual leaves."],
      "Employees receive 30 annual leaves.",
    );

    expect(result.isGrounded).toBe(false);
  });

  it("rejects malformed evaluator JSON", async () => {
    generateContentMock.mockResolvedValue({
      text: "This answer is supported.",
    });

    await expect(
      validateAnswer(
        "How many annual leaves?",
        ["Employees receive 20 annual leaves."],
        "Employees receive 20 annual leaves.",
      ),
    ).rejects.toThrow("invalid JSON");
  });
});
