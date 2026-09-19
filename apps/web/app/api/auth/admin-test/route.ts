import { NextResponse } from "next/server";
import { requireRole } from "@business-platform/auth/authorization";

export async function GET() {
  try {
    const user = await requireRole(["OWNER", "MANAGER"]);

    return NextResponse.json({
      message: "Access granted.",
      user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated.") {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message === "Forbidden.") {
      return NextResponse.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Authorization failed." },
      { status: 500 }
    );
  }
}