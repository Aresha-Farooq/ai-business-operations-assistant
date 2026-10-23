import { NextResponse } from "next/server";
import { getCurrentUser } from "@business-platform/auth/session";
import { answerQuestion } from "@business-platform/rag";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const question = body?.question;

    if (typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { error: "Question is required." },
        { status: 400 }
      );
    }

    const answer = await answerQuestion(
      user.organizationId,
      question.trim()
    );

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Assistant API error:", error);

    return NextResponse.json(
      { error: "Failed to generate answer." },
      { status: 500 }
    );
  }
}