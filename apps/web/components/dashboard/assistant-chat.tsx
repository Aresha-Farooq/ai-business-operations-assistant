"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { ASSISTANT_SUGGESTED_QUESTIONS } from "@/lib/assistant-questions";

type ChatRole = "user" | "assistant";

type AnswerCitation = {
  documentId: number;
  chunkIndex: number;
  source: string;
  content: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  citations?: AnswerCitation[];
  isError?: boolean;
  isUnavailable?: boolean;
};

type ConversationItem = {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type AskFailure = {
  error?: string;
};

type ProgressStage = "searching" | "generating" | "validating";

type StreamEvent =
  | { type: "progress"; stage: ProgressStage }
  | { type: "token"; token: string }
  | {
      type: "done";
      answer: string;
      citations: AnswerCitation[];
      conversationId: number;
    }
  | { type: "error"; error: string };

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function looksLikeNoRelevantInformation(answer: string) {
  const normalized = answer.toLowerCase();

  return (
    normalized.includes("couldn't find relevant information") ||
    normalized.includes("could not find") ||
    normalized.includes("couldn't verify a reliable answer") ||
    normalized.includes("no relevant")
  );
}

async function askQuestion(
  question: string,
  conversationId: number,
  onToken: (token: string) => void,
  onProgress: (stage: ProgressStage) => void,
) {
  const response = await fetch("/api/assistant/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ question, conversationId }),
  });

  if (!response.ok) {
    let message = "The assistant could not generate an answer. Please try again.";

    try {
      const data = (await response.json()) as AskFailure;
      if (data.error) message = data.error;
    } catch {
      // Keep the default error message.
    }

    return {
      ok: false as const,
      status: response.status,
      message:
        response.status === 401
          ? "You are not signed in or your session has expired. Sign in again."
          : message,
    };
  }

  if (!response.body) {
    return {
      ok: false as const,
      status: 500,
      message: "Streaming is not supported by this response.",
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let completedEvent:
    | {
        answer: string;
        citations: AnswerCitation[];
        conversationId: number;
      }
    | undefined;

  let streamError = "";

  function processLine(line: string) {
    if (!line.trim()) return;

    let event: StreamEvent;

    try {
      event = JSON.parse(line) as StreamEvent;
    } catch {
      streamError = "The assistant returned an invalid streaming response.";
      return;
    }

    if (event.type === "progress") {
      onProgress(event.stage);
    } else if (event.type === "token") {
      onToken(event.token);
    } else if (event.type === "done") {
      completedEvent = event;
    } else if (event.type === "error") {
      streamError = event.error;
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        processLine(line);
      }

      if (streamError) {
        await reader.cancel().catch(() => {});
        break;
      }
    }

    buffer += decoder.decode();

    if (!streamError && buffer.trim()) {
      processLine(buffer);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }

  if (streamError) {
    return {
      ok: false as const,
      status: 500,
      message: streamError,
    };
  }

  if (!completedEvent) {
    return {
      ok: false as const,
      status: 500,
      message: "The assistant stream ended before the answer was completed.",
    };
  }

  return {
    ok: true as const,
    answer: completedEvent.answer,
    citations: completedEvent.citations,
    conversationId: completedEvent.conversationId,
  };
}

export function AssistantChat() {
  const [progressStage, setProgressStage] =
    useState<ProgressStage | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, progressStage]);

  async function loadConversations() {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch("/api/assistant/conversations", {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Unable to load conversation history.");
      }

      const data = await response.json();
      setConversations(data.conversations ?? []);
    } catch (error) {
      console.error("Loading conversations failed:", error);
      setHistoryError("Conversation history could not be loaded.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    void loadConversations();
  }, []);

  async function createConversation(title: string) {
    const response = await fetch("/api/assistant/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ title: title.slice(0, 120) }),
    });

    if (!response.ok) {
      throw new Error("Unable to create a conversation.");
    }

    const data = await response.json();
    const conversation = data.conversation as ConversationItem;

    setConversations((current) => [
      conversation,
      ...current.filter((item) => item.id !== conversation.id),
    ]);

    setConversationId(conversation.id);

    return conversation.id;
  }

  async function startNewConversation() {
    if (loading) return;

    setConversationId(null);
    setMessages([]);
    setInput("");
    setAuthRequired(false);
    setProgressStage(null);
  }

  async function openConversation(id: number) {
    if (loading || id === conversationId) return;

    try {
      setHistoryError("");

      const response = await fetch(
        `/api/assistant/conversations/${id}`,
        { credentials: "same-origin" },
      );

      if (!response.ok) {
        throw new Error("Unable to open this conversation.");
      }

      const data = await response.json();

      setConversationId(data.conversation.id);

      setMessages(
        (data.messages ?? []).map(
          (message: {
            id: string | number;
            role: ChatRole;
            content: string;
            citations?: AnswerCitation[];
          }) => ({
            id: String(message.id),
            role: message.role,
            content: message.content,
            citations: message.citations ?? [],
            isUnavailable:
              message.role === "assistant" &&
              looksLikeNoRelevantInformation(message.content),
          }),
        ),
      );
    } catch (error) {
      console.error("Opening conversation failed:", error);
      setHistoryError("Unable to open this conversation.");
    }
  }

  async function submitQuestion(question: string) {
    const trimmed = question.trim();

    if (!trimmed || loading) return;

    const assistantId = createId();

    setInput("");
    setLoading(true);
    setProgressStage("searching");
    setAuthRequired(false);

    setMessages((current) => [
      ...current,
      {
        id: createId(),
        role: "user",
        content: trimmed,
      },
      {
        id: assistantId,
        role: "assistant",
        content: "",
      },
    ]);

    try {
      let activeConversationId = conversationId;

      if (activeConversationId === null) {
        activeConversationId = await createConversation(trimmed);
      }

      const result = await askQuestion(
        trimmed,
        activeConversationId,
        (token) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + token }
                : message,
            ),
          );
        },
        (stage) => {
          setProgressStage(stage);
        },
      );

      if (!result.ok) {
        if (result.status === 401) {
          setAuthRequired(true);
        }

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: result.message,
                  citations: [],
                  isError: true,
                  isUnavailable: false,
                }
              : message,
          ),
        );

        return;
      }

      setConversationId(result.conversationId);

      // Replace the streamed draft with the final validated answer.
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: result.answer,
                citations: result.citations,
                isError: false,
                isUnavailable: looksLikeNoRelevantInformation(result.answer),
              }
            : message,
        ),
      );

      void loadConversations();
    } catch (error) {
      console.error("Submitting assistant question failed:", error);

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: "Unable to reach the assistant. Please try again.",
                citations: [],
                isError: true,
                isUnavailable: false,
              }
            : message,
        ),
      );
    } finally {
      setLoading(false);
      setProgressStage(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitQuestion(input);
    }
  }

  const progressMessage =
    progressStage === "searching"
      ? "Searching your organization's documents..."
      : progressStage === "generating"
        ? "Generating an answer..."
        : progressStage === "validating"
          ? "Checking the answer against available information..."
          : "Preparing your answer...";

  return (
    <div className="flex h-[calc(100vh-3.75rem)] min-h-[32rem] flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-4 md:px-8">
        <h2 className="text-lg font-semibold text-slate-900">
          AI Assistant
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Answers come from your organization's processed documents. If
          documents have not been uploaded or indexed yet, the assistant may
          not have relevant information.
        </p>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3">
          <button
            type="button"
            onClick={() => void startNewConversation()}
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            + New chat
          </button>

          <h3 className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recent conversations
          </h3>

          {historyLoading ? (
            <p className="px-1 text-sm text-slate-500">
              Loading history...
            </p>
          ) : conversations.length === 0 ? (
            <p className="px-1 text-sm text-slate-500">
              No saved chats yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => void openConversation(conversation.id)}
                    disabled={loading}
                    title={conversation.title}
                    className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-white disabled:opacity-50 ${
                      conversation.id === conversationId
                        ? "bg-white font-medium text-slate-900 shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    {conversation.title}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {historyError ? (
            <p role="alert" className="mt-3 text-xs text-rose-700">
              {historyError}
            </p>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className="flex-1 overflow-y-auto px-4 py-6 md:px-8"
            aria-live="polite"
          >
            {messages.length === 0 && !loading ? (
              <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <p className="font-medium text-slate-800">
                  Start a conversation
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Ask a question about company policies, leave, or the contents
                  of your knowledge documents.
                </p>

                <ul className="mt-5 grid gap-2 text-left">
                  {ASSISTANT_SUGGESTED_QUESTIONS.map((question) => (
                    <li key={question}>
                      <button
                        type="button"
                        onClick={() => void submitQuestion(question)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-slate-400 hover:bg-white"
                      >
                        {question}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                        message.role === "user"
                          ? "bg-slate-900 text-white"
                          : message.isError
                            ? "border border-rose-200 bg-rose-50 text-rose-800"
                            : message.isUnavailable
                              ? "border border-amber-200 bg-amber-50 text-amber-950"
                              : "border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                        {message.role === "user" ? "You" : "Assistant"}
                      </p>

                      <p className="whitespace-pre-wrap">
                        {message.content}
                      </p>

                      {message.role === "assistant" &&
                      message.citations?.length ? (
                        <div className="mt-4 border-t border-slate-200 pt-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Sources
                          </p>

                          <ul className="space-y-2">
                            {message.citations.map((citation, index) => (
                              <li
                                key={`${citation.documentId}-${citation.chunkIndex}-${index}`}
                                className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"
                              >
                                <p className="font-medium text-slate-800">
                                  {citation.source}
                                </p>

                                <p className="mt-1">
                                  Document #{citation.documentId} · Chunk{" "}
                                  {citation.chunkIndex}
                                </p>

                                <p className="mt-2 whitespace-pre-wrap">
                                  {citation.content}
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {message.isUnavailable ? (
                        <p className="mt-2 text-xs font-medium">
                          No relevant information was found in the available
                          documents.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}

                {loading ? (
                  <div className="flex justify-start">
                    <div
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm"
                      role="status"
                    >
                      {progressMessage}
                    </div>
                  </div>
                ) : null}

                <div ref={endRef} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-4 md:px-8">
            {authRequired ? (
              <p role="alert" className="mb-3 text-sm text-rose-700">
                Your session is not authenticated.{" "}
                <Link href="/login" className="font-medium underline">
                  Sign in
                </Link>{" "}
                to continue.
              </p>
            ) : null}

            {messages.length > 0 ? (
              <div className="mx-auto mb-3 flex max-w-3xl flex-wrap gap-2">
                {ASSISTANT_SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    disabled={loading}
                    onClick={() => void submitQuestion(question)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400 hover:bg-white disabled:opacity-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            ) : null}

            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-3xl items-end gap-3"
            >
              <label htmlFor="assistant-question" className="sr-only">
                Message to the AI assistant
              </label>

              <textarea
                id="assistant-question"
                rows={2}
                value={input}
                disabled={loading}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your business documents..."
                className="min-h-[3rem] w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
            </form>

            <p className="mx-auto mt-2 max-w-3xl text-xs text-slate-500">
              Press Enter to send. Shift+Enter adds a new line.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}