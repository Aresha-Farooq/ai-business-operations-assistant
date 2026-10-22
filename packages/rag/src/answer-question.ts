
import { generateAnswer } from "@business-platform/ai";
import { searchSimilarChunks } from "./document-chunk-storage.js";

export async function answerQuestion(
  organizationId: number,
  question: string,
  limit: number = 5,
): Promise<string> {
  if (!question.trim()) {
    throw new Error("Question cannot be empty");
  }
  const chunks = await searchSimilarChunks(
    organizationId,
    question,
    limit,
  );

  const context = chunks.map((chunk) => String(chunk.content));

  return generateAnswer(question, context);
}
