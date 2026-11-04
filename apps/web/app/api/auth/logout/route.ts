import { NextResponse } from "next/server";
import { getCurrentUser } from "@business-platform/auth/session";
import { createAuditLog } from "@business-platform/database";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (user) {
      await createAuditLog({
        organizationId: user.organizationId,
        userId: user.userId,
        action: "LOGOUT",
        source: "AUTH",
        status: "SUCCESS",
      });
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return NextResponse.json(
      { error: "Logout failed." },
      { status: 500 }
    );
  }
}