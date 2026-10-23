
import { searchSimilarChunks } from "./document-chunk-storage.js";
import { generateAnswer } from "../../ai/src/generate-answer.js";
import { validateAnswer } from "../../ai/src/validate-answer.js";
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

  const answer = await generateAnswer(question, context);

  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("The AI generated an empty or invalid answer.");
  }

  const validation = await validateAnswer(
    question,
    context,
    answer,
  );

  if (!validation.isGrounded) {
    console.warn("AI answer failed grounding validation:", validation.reason);

    return "I couldn't verify a reliable answer from the available company documents. Please consult the relevant company policy or an authorized team member.";
  }

  return answer.trim();
}
