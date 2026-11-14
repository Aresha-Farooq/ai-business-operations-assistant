import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { PaymentError } from "@business-platform/business/payment/payment-rules";

/**
 * Maps payment errors to HTTP responses; returns null for anything else.
 *   NOT_FOUND             -> 404 (also used for other organizations' data)
 *   INVALID_STATE         -> 409
 *   CONFLICT              -> 409
 *   VERIFICATION_MISMATCH -> 422
 *   UNSUPPORTED_METHOD    -> 422
 *   GATEWAY_ERROR         -> 502
 *   invalid request body  -> 400
 */
export function paymentErrorResponse(
  error: unknown
): NextResponse | null {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request.", details: error.issues },
      { status: 400 }
    );
  }

  if (!(error instanceof PaymentError)) {
    return null;
  }

  const statusByCode = {
    NOT_FOUND: 404,
    INVALID_STATE: 409,
    INVALID_AMOUNT: 422,
    CONFLICT: 409,
    VERIFICATION_MISMATCH: 422,
    UNSUPPORTED_METHOD: 422,
    GATEWAY_ERROR: 502,
  } as const;

  return NextResponse.json(
    { error: error.message },
    { status: statusByCode[error.code] }
  );
}
