import { NextResponse } from "next/server";
import { getCurrentUser } from "@business-platform/auth/session";
import { streamAnswerQuestion } from "@business-platform/rag";
import { db, getDbRuntime } from "@business-platform/database";

export const runtime = "nodejs";

type StreamEvent =
  | { type: "token"; token: string }
  | {
      type: "done";
      answer: string;
      citations: Awaited<
        ReturnType<typeof streamAnswerQuestion>
      >["citations"];
      conversationId: number;
    }
  | { type: "error"; error: string };

const encoder = new TextEncoder();

function encodeEvent(event: StreamEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const question =
      typeof body?.question === "string"
        ? body.question.trim()
        : "";
    const conversationId = body?.conversationId;

    if (!question) {
      return NextResponse.json(
        { error: "Question is required." },
        { status: 400 },
      );
    }

    if (question.length > 2000) {
      return NextResponse.json(
        { error: "Question must be 2000 characters or fewer." },
        { status: 400 },
      );
    }

    if (
      !Number.isSafeInteger(conversationId) ||
      conversationId <= 0
    ) {
      return NextResponse.json(
        { error: "A valid conversationId is required." },
        { status: 400 },
      );
    }

    const runtime = await getDbRuntime();

    // Verify both user ownership and tenant ownership.
    const conversationPlan = db.sql.public.conversation
      .select("id")
      .where((fields, fns) =>
        fns.and(
          fns.eq(fields.id, conversationId),
          fns.eq(fields.organizationId, user.organizationId),
          fns.eq(fields.userId, user.userId),
        ),
      )
      .build();

    const conversations = await runtime.query(conversationPlan);

    if (!conversations[0]) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    // Persist the user's question before generating the answer.
    const userMessagePlan = db.sql.public.message
      .insert([
        {
          conversationId,
          role: "user",
          content: question,
        },
      ])
      .returning("id")
      .build();

    await runtime.query(userMessagePlan);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let streamOpen = true;

        const closeStream = () => {
          if (!streamOpen) return;

          streamOpen = false;

          try {
            controller.close();
          } catch {
            // The stream may already have been closed or cancelled.
          }
        };

        const sendEvent = (event: StreamEvent): boolean => {
          if (!streamOpen) return false;

          try {
            controller.enqueue(encodeEvent(event));
            return true;
          } catch {
            // Stop attempting to write if the controller is unavailable.
            streamOpen = false;
            return false;
          }
        };

        try {
          const result = await streamAnswerQuestion(
            user.organizationId,
            question,
            (token) => {
              sendEvent({ type: "token", token });
            },
          );

          // Do not attempt further writes if the stream is unavailable.
          if (!streamOpen) return;

          // Persist the final answer and citations after validation.
          const assistantMessagePlan = db.sql.public.message
            .insert([
              {
                conversationId,
                role: "assistant",
                content: result.answer,
                citationsJson: JSON.stringify(
                  result.citations ?? [],
                ),
              },
            ])
            .returning("id")
            .build();

          await runtime.query(assistantMessagePlan);

          const updatePlan = db.sql.public.conversation
            .update({
              updatedAt: new Date().toISOString(),
            })
            .where((fields, fns) =>
              fns.and(
                fns.eq(fields.id, conversationId),
                fns.eq(
                  fields.organizationId,
                  user.organizationId,
                ),
                fns.eq(fields.userId, user.userId),
              ),
            )
            .returning("id")
            .build();

          await runtime.query(updatePlan);

          sendEvent({
            type: "done",
            answer: result.answer,
            citations: result.citations ?? [],
            conversationId,
          });

          closeStream();
        } catch (error) {
          console.error("Assistant streaming error:", error);

          sendEvent({
            type: "error",
            error:
              "Failed to generate or save the answer. Please try again.",
          });

          closeStream();
        }
      },

      cancel() {
        // The client has cancelled its stream.
        // The controller must not receive further writes.
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Assistant API error:", error);

    return NextResponse.json(
      { error: "Failed to generate answer." },
      { status: 500 },
    );
  }
}
