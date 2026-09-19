import { NextResponse } from "next/server";
import { getCurrentUser } from "@business-platform/auth/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user,
  });
}