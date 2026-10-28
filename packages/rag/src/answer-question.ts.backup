
import { searchSimilarChunks } from "./document-chunk-storage.js";
import {
  generateAnswer,
  generateAnswerStream,
} from "../../ai/src/generate-answer.js";
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

const SAFE_FALLBACK =
  "I couldn't verify a reliable answer from the available company documents. Please consult the relevant company policy or an authorized team member.";

function createCitations(
  chunks: Awaited<ReturnType<typeof searchSimilarChunks>>,
): AnswerCitation[] {
  return chunks.map((chunk) => ({
    documentId: Number(chunk.documentId),
    chunkIndex: Number(chunk.chunkIndex),
    source: String(chunk.source ?? "Unknown source"),
    content: String(chunk.content),
  }));
}

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
      answer: SAFE_FALLBACK,
      citations: [],
    };
  }

  return {
    answer: answer.trim(),
    citations: createCitations(chunks),
  };
}

export async function streamAnswerQuestion(
  organizationId: number,
  question: string,
  onToken: (token: string) => void,
  limit: number = 5,
): Promise<AnswerQuestionResult> {
  if (!question.trim()) {
    throw new Error("Question cannot be empty");
  }

  const startedAt = Date.now();

  console.log("[RAG stream] Searching relevant chunks");

  const chunks = await searchSimilarChunks(
    organizationId,
    question,
    limit,
  );

  const context = chunks.map((chunk) => String(chunk.content));

  console.log(
    `[RAG stream] Retrieval completed in ${Date.now() - startedAt}ms`,
  );

  let answer = "";
  let tokenCount = 0;

  console.log("[RAG stream] Starting Gemini generation");

  for await (const token of generateAnswerStream(question, context)) {
    answer += token;
    tokenCount++;

    // Forward every generated chunk immediately to the API route.
    onToken(token);
  }

  console.log(
    `[RAG stream] Generation completed in ${Date.now() - startedAt}ms; chunks received: ${tokenCount}`,
  );

  if (!answer.trim()) {
    throw new Error("The AI generated an empty answer.");
  }

  console.time("RAG stream answer validation");

  const validation = await validateAnswer(
    question,
    context,
    answer,
  );

  console.timeEnd("RAG stream answer validation");

  if (!validation.isGrounded) {
    console.warn(
      "AI answer failed grounding validation:",
      validation.reason,
    );

    return {
      answer: SAFE_FALLBACK,
      citations: [],
    };
  }

  return {
    answer: answer.trim(),
    citations: createCitations(chunks),
  };
}
