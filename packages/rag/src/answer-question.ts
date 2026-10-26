
import { searchSimilarChunks } from "./document-chunk-storage.js";
import { generateAnswer } from "../../ai/src/generate-answer.js";
import { validateAnswer } from "../../ai/src/validate-answer.js";

export type AnswerCitation = {
  documentId: number;
  chunkIndex: number;
  source: string;
  content: string;
};

export type AnswerQuestionResult = {
  answer: string;
  citations: AnswerCitation[];
};

export async function answerQuestion(
  organizationId: number,
  question: string,
  limit: number = 5,
): Promise<AnswerQuestionResult> {
  if (!question.trim()) {
    throw new Error("Question cannot be empty");
  }

  const chunks = await searchSimilarChunks(
    organizationId,
    question,
    limit,
  );

  const context = chunks.map((chunk) => String(chunk.content));

console.time("RAG answer generation");

const answer = await generateAnswer(question, context);

console.timeEnd("RAG answer generation");

  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("The AI generated an empty or invalid answer.");
  }

 console.time("RAG answer validation");

const validation = await validateAnswer(
  question,
  context,
  answer,
);

console.timeEnd("RAG answer validation");

  if (!validation.isGrounded) {
    console.warn(
      "AI answer failed grounding validation:",
      validation.reason,
    );

    return {
      answer:
        "I couldn't verify a reliable answer from the available company documents. Please consult the relevant company policy or an authorized team member.",
      citations: [],
    };
  }

  return {
    answer: answer.trim(),
    citations: chunks.map((chunk) => ({
      documentId: Number(chunk.documentId),
      chunkIndex: Number(chunk.chunkIndex),
      source: String(chunk.source ?? "Unknown source"),
      content: String(chunk.content),
    })),
  };
}
