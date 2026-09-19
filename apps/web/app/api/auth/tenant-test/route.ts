import { NextResponse } from "next/server";
import { requireOrganizationAccess } from "@business-platform/auth/tenant";

export async function GET() {
  try {
   const user = await requireOrganizationAccess(1);

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
      { error: "Tenant authorization failed." },
      { status: 500 }
    );
  }
}