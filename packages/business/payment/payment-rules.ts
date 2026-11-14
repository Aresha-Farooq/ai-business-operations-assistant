// Pure payment rules and error type.
// No imports on purpose: unit-testable without a database, cookies or the
// Next.js runtime (same convention as order-status.ts and permissions.ts).

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type PaymentMethod = "COD" | "CARD" | "JAZZCASH" | "EASYPAISA";

// --------------------------------------------------
// Payment errors (mapped to HTTP codes by the API layer)
// --------------------------------------------------

export type PaymentErrorCode =
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "CONFLICT"
  | "VERIFICATION_MISMATCH"
  | "UNSUPPORTED_METHOD"
  | "INVALID_AMOUNT"
  | "GATEWAY_ERROR";

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;

  constructor(code: PaymentErrorCode, message: string) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
  }
}

// --------------------------------------------------
// Money helpers
// Amounts are stored as Float, so compare in minor units (paisa) instead of
// using !== on floating point numbers.
// --------------------------------------------------

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function amountsMatch(a: number, b: number): boolean {
  return (
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    toMinorUnits(a) === toMinorUnits(b)
  );
}

// --------------------------------------------------
// Payment creation
// --------------------------------------------------

export type ExistingPayment = {
  id: number;
  status: PaymentStatus;
  method: PaymentMethod;
};

export type CreatePaymentDecision =
  | { action: "create" }
  | { action: "reuse"; paymentId: number };

// Decides what createPayment must do for an order. Idempotent by design:
//   - same method + an open PENDING payment -> reuse it (safe retry/replay)
//   - different method + an open PENDING payment -> conflict
//   - a PAID payment -> rejected
//   - only FAILED / REFUNDED payments -> a new payment may be created
export function getCreatePaymentDecision(
  order: { status: string },
  existingPayments: ExistingPayment[],
  method: PaymentMethod
): CreatePaymentDecision {
  if (order.status === "CANCELLED") {
    throw new PaymentError(
      "INVALID_STATE",
      "Cannot create a payment for a cancelled order."
    );
  }

  if (order.status === "COMPLETED") {
    throw new PaymentError(
      "INVALID_STATE",
      "Cannot create a payment for a completed order."
    );
  }

  if (existingPayments.some((payment) => payment.status === "PAID")) {
    throw new PaymentError(
      "INVALID_STATE",
      "This order has already been paid."
    );
  }

  const pending = existingPayments.filter(
    (payment) => payment.status === "PENDING"
  );

  const samePending = pending.find((payment) => payment.method === method);

  if (samePending) {
    return { action: "reuse", paymentId: samePending.id };
  }

  if (pending.length > 0) {
    throw new PaymentError(
      "CONFLICT",
      `This order already has a pending ${pending[0]!.method} payment.`
    );
  }

  return { action: "create" };
}

// --------------------------------------------------
// Payment verification
// --------------------------------------------------

export type VerifiablePayment = {
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  currency: string;
  gateway: string | null;
  gatewayTransactionId: string | null;
};

export type GatewayVerification = {
  status: PaymentStatus;
  transactionId: string;
  amount: number;
  currency: string;
};

// "replay": already PAID, return the stored result without calling the gateway.
// "proceed": the payment is PENDING and may be verified with the gateway.
export function getVerifyPrecondition(
  payment: VerifiablePayment
): "replay" | "proceed" {
  if (payment.status === "PAID") {
    return "replay";
  }

  if (payment.status !== "PENDING") {
    throw new PaymentError(
      "INVALID_STATE",
      `Cannot verify a payment with status ${payment.status}.`
    );
  }

  if (payment.method === "COD" || !payment.gateway) {
    throw new PaymentError(
      "INVALID_STATE",
      "This payment is not processed through a payment gateway."
    );
  }

  return "proceed";
}

// Compares the gateway's answer with OUR record of the payment and returns
// the status the payment may move to. Throws on any inconsistency, so a
// forged or mismatching answer can never mark a payment as PAID.
export function getVerificationOutcome(
  payment: VerifiablePayment,
  transactionId: string,
  result: GatewayVerification
): "PAID" | "FAILED" | "PENDING" {
  if (
    !payment.gatewayTransactionId ||
    payment.gatewayTransactionId !== transactionId
  ) {
    throw new PaymentError(
      "VERIFICATION_MISMATCH",
      "Transaction does not belong to this payment."
    );
  }

  if (result.transactionId !== transactionId) {
    throw new PaymentError(
      "VERIFICATION_MISMATCH",
      "Gateway returned a different transaction ID."
    );
  }

  if (result.status === "REFUNDED") {
    throw new PaymentError(
      "VERIFICATION_MISMATCH",
      "A pending payment cannot be verified as refunded."
    );
  }

  if (result.status === "PAID") {
    if (!amountsMatch(result.amount, payment.amount)) {
      throw new PaymentError(
        "VERIFICATION_MISMATCH",
        "Verified payment amount does not match."
      );
    }

    if (result.currency !== payment.currency) {
      throw new PaymentError(
        "VERIFICATION_MISMATCH",
        "Verified payment currency does not match."
      );
    }
  }

  return result.status;
}

// --------------------------------------------------
// Refunds
//
// The Payment table has no "refunded amount" column, so only a FULL refund
// can be tracked accurately (PAID -> REFUNDED). A requested amount is
// validated on the server and must equal the payment amount; partial
// refunds are rejected until the schema can record cumulative refunds.
// --------------------------------------------------

export type RefundablePayment = {
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  gateway: string | null;
  gatewayTransactionId: string | null;
};

// "replay": already REFUNDED, return the stored result without a gateway call.
// "proceed": the payment is PAID and may be refunded through its gateway.
export function getRefundDecision(
  payment: RefundablePayment,
  requestedAmount?: number
): "replay" | "proceed" {
  if (requestedAmount !== undefined) {
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      throw new PaymentError(
        "INVALID_AMOUNT",
        "Refund amount must be greater than zero."
      );
    }

    if (toMinorUnits(requestedAmount) > toMinorUnits(payment.amount)) {
      throw new PaymentError(
        "INVALID_AMOUNT",
        "Refund amount exceeds the refundable amount."
      );
    }

    if (!amountsMatch(requestedAmount, payment.amount)) {
      throw new PaymentError(
        "INVALID_AMOUNT",
        "Partial refunds are not supported yet. Refund the full payment amount."
      );
    }
  }

  if (payment.status === "REFUNDED") {
    return "replay";
  }

  if (payment.status !== "PAID") {
    throw new PaymentError(
      "INVALID_STATE",
      `Only paid payments can be refunded (current status: ${payment.status}).`
    );
  }

  if (
    payment.method === "COD" ||
    !payment.gateway ||
    !payment.gatewayTransactionId
  ) {
    throw new PaymentError(
      "INVALID_STATE",
      "This payment was not processed through a payment gateway and cannot be refunded here."
    );
  }

  return "proceed";
}

// Accepts the gateway's refund answer only when it is a confirmed REFUNDED
// for OUR transaction. Anything else must leave the payment PAID.
export function getRefundGatewayOutcome(
  payment: RefundablePayment,
  result: { status: PaymentStatus; transactionId?: string }
): void {
  if (result.status !== "REFUNDED") {
    throw new PaymentError(
      "GATEWAY_ERROR",
      "The payment gateway did not confirm the refund. The payment was not marked as refunded."
    );
  }

  // A status alone is not proof that OUR transaction was refunded.
  // Require an exact, non-empty transaction ID from the gateway.
  if (
    typeof result.transactionId !== "string" ||
    result.transactionId.trim().length === 0 ||
    !payment.gatewayTransactionId ||
    result.transactionId !== payment.gatewayTransactionId
  ) {
    throw new PaymentError(
      "VERIFICATION_MISMATCH",
      "Gateway did not confirm the refund for the exact stored transaction ID."
    );
  }
}
