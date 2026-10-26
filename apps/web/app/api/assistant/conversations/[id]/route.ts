
import { NextResponse } from "next/server";
import { getCurrentUser } from "@business-platform/auth/session";
import { db, getDbRuntime } from "@business-platform/database";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      );
    }

    const { id } = await params;
    const conversationId = Number(id);

    if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
      return NextResponse.json(
        { error: "Invalid conversation ID." },
        { status: 400 },
      );
    }

    const runtime = await getDbRuntime();

    const conversationPlan = db.sql.public.conversation
      .select("id", "title", "createdAt", "updatedAt")
      .where((fields, fns) =>
        fns.and(
          fns.eq(fields.id, conversationId),
          fns.eq(fields.organizationId, user.organizationId),
          fns.eq(fields.userId, user.userId),
        ),
      )
      .build();

    const conversations = await runtime.query(conversationPlan);
    const conversation = conversations[0];

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const messagesPlan = db.sql.public.message
      .select(
        "id",
        "role",
        "content",
        "citationsJson",
        "createdAt",
      )
      .where((fields, fns) =>
        fns.eq(fields.conversationId, conversationId),
      )
      .build();

   const rows = (await runtime.query(messagesPlan)).sort(
  (a, b) =>
    new Date(a.createdAt).getTime() -
    new Date(b.createdAt).getTime(),
);

    const messages = rows.map((message) => {
      let citations = [];

      if (message.citationsJson) {
        try {
          citations = JSON.parse(message.citationsJson);
        } catch {
          citations = [];
        }
      }

      return {
        id: String(message.id),
        role: message.role,
        content: message.content,
        citations,
        createdAt: message.createdAt,
      };
    });

    return NextResponse.json({ conversation, messages });
  } catch (error) {
    console.error("Conversation retrieval failed:", error);

    return NextResponse.json(
      { error: "Unable to load conversation." },
      { status: 500 },
    );
  }
}
