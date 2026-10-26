
import { NextResponse } from "next/server";
import { getCurrentUser } from "@business-platform/auth/session";
import { answerQuestion } from "@business-platform/rag";
import { db, getDbRuntime } from "@business-platform/database";

export const runtime = "nodejs";

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
      typeof body?.question === "string" ? body.question.trim() : "";
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

    // Verify ownership before reading or writing any messages.
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

    // Save the user's question.
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

    // Preserve the existing RAG answer generation.
    const result = await answerQuestion(
      user.organizationId,
      question,
    );

    const citationsJson = JSON.stringify(result.citations ?? []);

    // Save the answer and its citations.
    const assistantMessagePlan = db.sql.public.message
      .insert([
        {
          conversationId,
          role: "assistant",
          content: result.answer,
          citationsJson,
        },
      ])
      .returning("id")
      .build();

    await runtime.query(assistantMessagePlan);

    // Update the conversation's last-activity timestamp.
   
const updatePlan = db.sql.public.conversation
  .update({
    updatedAt: new Date().toISOString(),
  })
  .where((fields, fns) =>
    fns.and(
      fns.eq(fields.id, conversationId),
      fns.eq(fields.organizationId, user.organizationId),
      fns.eq(fields.userId, user.userId),
    ),
  )
  .returning("id")
  .build();

await runtime.query(updatePlan);

     

    return NextResponse.json({
      ...result,
      conversationId,
    });
  } catch (error) {
    console.error("Assistant API error:", error);

    return NextResponse.json(
      { error: "Failed to generate answer." },
      { status: 500 },
    );
  }
}
