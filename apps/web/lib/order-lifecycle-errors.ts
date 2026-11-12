import { NextResponse } from "next/server";
import { OrderLifecycleError } from "@business-platform/business/order-status";

/**
 * Maps lifecycle errors to HTTP responses; returns null for anything else.
 *   NOT_FOUND          -> 404 (also used for other organizations' orders)
 *   INVALID_TRANSITION -> 409
 *   CONFLICT           -> 409
 */
export function orderLifecycleErrorResponse(
  error: unknown
): NextResponse | null {
  if (!(error instanceof OrderLifecycleError)) {
    return null;
  }

  const status = error.code === "NOT_FOUND" ? 404 : 409;

  return NextResponse.json({ error: error.message }, { status });
}
