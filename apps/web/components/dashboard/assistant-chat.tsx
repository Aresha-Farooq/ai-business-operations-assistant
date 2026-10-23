"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ASSISTANT_SUGGESTED_QUESTIONS } from "@/lib/assistant-questions";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  isError?: boolean;
  isUnavailable?: boolean;
};

type AskSuccess = {
  answer: string;
};

type AskFailure = {
  error?: string;
};

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

async function askQuestion(question: string) {
  const response = await fetch("/api/assistant/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ question }),
  });

  let data: AskSuccess | AskFailure | null = null;

  try {
    data = (await response.json()) as AskSuccess | AskFailure;
  } catch {
    data = null;
  }

  if (response.status === 401) {
    return {
      ok: false as const,
      status: 401,
      message:
        "You are not signed in or your session has expired. Sign in again to ask the assistant.",
    };
  }

  if (response.status === 400) {
    return {
      ok: false as const,
      status: 400,
      message:
        (data && "error" in data && data.error) ||
        "Please enter a question before sending.",
    };
  }

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      message:
        (data && "error" in data && data.error) ||
        "The assistant could not generate an answer. Please try again.",
    };
  }

  const answer = data && "answer" in data ? data.answer : "";

  if (typeof answer !== "string" || !answer.trim()) {
    return {
      ok: false as const,
      status: 500,
      message: "The assistant returned an empty response.",
    };
  }

  return {
    ok: true as const,
    answer: answer.trim(),
  };
}

export function AssistantChat() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const autoAsked = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submitQuestion(question: string) {
    const trimmed = question.trim();

    if (!trimmed || loading) {
      return;
    }

    setInput("");
    setLoading(true);
    setAuthRequired(false);

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);

    try {
      const result = await askQuestion(trimmed);

      if (!result.ok) {
        if (result.status === 401) {
          setAuthRequired(true);
        }

        setMessages((current) => [
          ...current,
          {
            id: createId(),
            role: "assistant",
            content: result.message,
            isError: true,
          },
        ]);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: result.answer,
          isUnavailable: looksLikeNoRelevantInformation(result.answer),
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: "Unable to reach the assistant. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const preset = searchParams.get("q");

    if (!preset || autoAsked.current) {
      return;
    }

    autoAsked.current = true;
    void submitQuestion(preset);
    // Intentionally run once for a preset query from the dashboard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  return (
    <div className="flex h-[calc(100vh-3.75rem)] min-h-[32rem] flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-4 md:px-8">
        <h2 className="text-lg font-semibold text-slate-900">AI Assistant</h2>
        <p className="mt-1 text-sm text-slate-500">
          Answers come from your organization&apos;s processed documents. If
          documents have not been uploaded or indexed yet, the assistant may
          not have relevant information.
        </p>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 py-6 md:px-8"
        aria-live="polite"
      >
        {messages.length === 0 && !loading ? (
          <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="font-medium text-slate-800">Start a conversation</p>
            <p className="mt-2 text-sm text-slate-500">
              Ask a question about company policies, leave, or the contents of
              your knowledge documents.
            </p>
            <ul className="mt-5 grid gap-2 text-left sm:grid-cols-1">
              {ASSISTANT_SUGGESTED_QUESTIONS.map((question) => (
                <li key={question}>
                  <button
                    type="button"
                    onClick={() => void submitQuestion(question)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-slate-400 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
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
                  message.role === "user" ? "justify-end" : "justify-start"
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
                  <p className="whitespace-pre-wrap">{message.content}</p>
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
                  The assistant is reviewing your documents...
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
            <Link
              href="/login"
              className="font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            >
              Sign in
            </Link>{" "}
            to continue.
          </p>
        ) : null}

        {messages.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {ASSISTANT_SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                disabled={loading}
                onClick={() => void submitQuestion(question)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-400 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:opacity-50"
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
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-xs text-slate-500">
          Press Enter to send. Shift+Enter adds a new line.
        </p>
      </div>
    </div>
  );
}
