import { NextResponse } from "next/server";
import { loginUser } from "@business-platform/auth/login";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const user = await loginUser({
      email: body.email,
      password: body.password,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      },
    });

    response.cookies.set("access_token", user.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });

    return response;
 } catch (error) {
  console.error("LOGIN ERROR:", error);

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Authentication failed.",
    },
    { status: 500 }
  );
}
}