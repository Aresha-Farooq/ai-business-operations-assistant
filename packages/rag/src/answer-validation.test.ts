
import { describe, it, expect, vi } from "vitest";

const { generateAnswerMock, validateAnswerMock } = vi.hoisted(() => ({
  generateAnswerMock: vi.fn(),
  validateAnswerMock: vi.fn(),
}));

vi.mock("../../ai/src/generate-answer.js", () => ({
  generateAnswer: generateAnswerMock,
}));

vi.mock("../../ai/src/validate-answer.js", () => ({
  validateAnswer: validateAnswerMock,
}));

vi.mock("./document-chunk-storage.js", () => ({
  searchSimilarChunks: vi.fn(),
}));

import { answerQuestion } from "./answer-question.js";
import { searchSimilarChunks } from "./document-chunk-storage.js";

describe("answerQuestion response validation", () => {
  it("returns an answer when it is grounded", async () => {
    vi.mocked(searchSimilarChunks).mockResolvedValue([
      { content: "Employees receive 20 annual leaves." },
    ] as Awaited<ReturnType<typeof searchSimilarChunks>>);

    generateAnswerMock.mockResolvedValue(
      "Employees receive 20 annual leaves.",
    );

    validateAnswerMock.mockResolvedValue({
      isGrounded: true,
      reason: "Supported by the document.",
    });

    await expect(
      answerQuestion(1, "How many annual leaves do employees receive?"),
    ).resolves.toBe("Employees receive 20 annual leaves.");
  });

  it("returns a safe fallback when an answer is not grounded", async () => {
    vi.mocked(searchSimilarChunks).mockResolvedValue([
      { content: "Employees receive 20 annual leaves." },
    ] as Awaited<ReturnType<typeof searchSimilarChunks>>);

    generateAnswerMock.mockResolvedValue(
      "Employees receive 30 annual leaves.",
    );

    validateAnswerMock.mockResolvedValue({
      isGrounded: false,
      reason: "The number contradicts the document.",
    });

    await expect(
      answerQuestion(1, "How many annual leaves do employees receive?"),
    ).resolves.toContain("couldn't verify a reliable answer");
  });

  it("rejects an empty question", async () => {
    await expect(answerQuestion(1, "   ")).rejects.toThrow(
      "Question cannot be empty",
    );
  });
});
