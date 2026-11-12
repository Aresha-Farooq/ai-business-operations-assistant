import { NextResponse } from "next/server";

/**
 * Maps authentication / authorization errors thrown by the auth package to
 * HTTP responses. Returns null for any other error so the caller can keep
 * its own handling.
 *
 *   "Not authenticated." -> 401
 *   "Forbidden."         -> 403
 */
export function authErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message === "Not authenticated.") {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  if (error.message === "Forbidden.") {
    return NextResponse.json(
      { error: "You do not have permission to perform this action." },
      { status: 403 }
    );
  }

  return null;
}
