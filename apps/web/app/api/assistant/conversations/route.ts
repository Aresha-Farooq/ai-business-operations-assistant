
import { NextResponse } from "next/server";
import { getCurrentUser } from "@business-platform/auth/session";
import { db, getDbRuntime } from "@business-platform/database";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      );
    }

    const runtime = await getDbRuntime();

    const query = db.sql.public.conversation
      .select("id", "title", "createdAt", "updatedAt")
      .where((fields, fns) =>
        fns.and(
          fns.eq(fields.organizationId, user.organizationId),
          fns.eq(fields.userId, user.userId),
        ),
      )
      .build();

    const conversations = await runtime.query(query);

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Conversation listing failed:", error);

    return NextResponse.json(
      { error: "Unable to load conversations." },
      { status: 500 },
    );
  }
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
    const requestedTitle =
      typeof body?.title === "string" ? body.title.trim() : "";

    const title = (requestedTitle || "New conversation").slice(0, 120);
    const runtime = await getDbRuntime();

    const insertPlan = db.sql.public.conversation
      .insert([
        {
          organizationId: user.organizationId,
          userId: user.userId,
          title,
        },
      ])
      .returning("id", "title", "createdAt", "updatedAt")
      .build();

    const inserted = await runtime.query(insertPlan);
    const conversation = inserted[0];

    if (!conversation) {
      throw new Error("Conversation was not created.");
    }

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("Conversation creation failed:", error);

    return NextResponse.json(
      { error: "Unable to create conversation." },
      { status: 500 },
    );
  }
}
