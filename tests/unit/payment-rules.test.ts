import { describe, expect, it } from "vitest";
import {
  PaymentError,
  amountsMatch,
  getCreatePaymentDecision,
  getRefundDecision,
  getRefundGatewayOutcome,
  getVerificationOutcome,
  getVerifyPrecondition,
  toMinorUnits,
  type GatewayVerification,
  type RefundablePayment,
  type VerifiablePayment,
} from "../../packages/business/payment/payment-rules";

function codeOf(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    return error instanceof PaymentError ? error.code : "OTHER";
  }
  return null;
}

describe("money comparison", () => {
  it("compares in minor units, not with raw floats", () => {
    expect(toMinorUnits(150.1)).toBe(15010);
    expect(amountsMatch(0.1 + 0.2, 0.3)).toBe(true);
    expect(amountsMatch(450, 450.01)).toBe(false);
    expect(amountsMatch(Number.NaN, 450)).toBe(false);
  });
});

describe("getCreatePaymentDecision", () => {
  const order = { status: "PENDING" };

  it("creates a payment when the order has none", () => {
    expect(getCreatePaymentDecision(order, [], "COD")).toEqual({
      action: "create",
    });
  });

  it("rejects cancelled and completed orders", () => {
    expect(
      codeOf(() => getCreatePaymentDecision({ status: "CANCELLED" }, [], "COD"))
    ).toBe("INVALID_STATE");
    expect(
      codeOf(() => getCreatePaymentDecision({ status: "COMPLETED" }, [], "COD"))
    ).toBe("INVALID_STATE");
  });

  it("rejects an order that is already paid", () => {
    const existing = [{ id: 1, status: "PAID", method: "JAZZCASH" }] as const;
    expect(
      codeOf(() => getCreatePaymentDecision(order, [...existing], "COD"))
    ).toBe("INVALID_STATE");
  });

  it("replays the same pending payment (idempotent)", () => {
    const existing = [{ id: 7, status: "PENDING", method: "COD" }] as const;
    expect(getCreatePaymentDecision(order, [...existing], "COD")).toEqual({
      action: "reuse",
      paymentId: 7,
    });
  });

  it("conflicts when a different method is already pending", () => {
    const existing = [{ id: 7, status: "PENDING", method: "COD" }] as const;
    expect(
      codeOf(() => getCreatePaymentDecision(order, [...existing], "JAZZCASH"))
    ).toBe("CONFLICT");
  });

  it("allows a new payment after FAILED or REFUNDED ones", () => {
    const existing = [
      { id: 1, status: "FAILED", method: "JAZZCASH" },
      { id: 2, status: "REFUNDED", method: "COD" },
    ] as const;
    expect(getCreatePaymentDecision(order, [...existing], "JAZZCASH")).toEqual({
      action: "create",
    });
  });
});

const basePayment: VerifiablePayment = {
  status: "PENDING",
  method: "JAZZCASH",
  amount: 450,
  currency: "PKR",
  gateway: "MOCK",
  gatewayTransactionId: "TX-1",
};

const goodResult: GatewayVerification = {
  status: "PAID",
  transactionId: "TX-1",
  amount: 450,
  currency: "PKR",
};

describe("getVerifyPrecondition", () => {
  it("proceeds for a pending gateway payment", () => {
    expect(getVerifyPrecondition(basePayment)).toBe("proceed");
  });

  it("replays an already paid payment without a gateway call", () => {
    expect(getVerifyPrecondition({ ...basePayment, status: "PAID" })).toBe(
      "replay"
    );
  });

  it("rejects failed and refunded payments", () => {
    for (const status of ["FAILED", "REFUNDED"] as const) {
      expect(codeOf(() => getVerifyPrecondition({ ...basePayment, status }))).toBe(
        "INVALID_STATE"
      );
    }
  });

  it("rejects COD and gateway-less payments", () => {
    expect(
      codeOf(() => getVerifyPrecondition({ ...basePayment, method: "COD" }))
    ).toBe("INVALID_STATE");
    expect(
      codeOf(() => getVerifyPrecondition({ ...basePayment, gateway: null }))
    ).toBe("INVALID_STATE");
  });
});

describe("getVerificationOutcome", () => {
  it("accepts a matching PAID answer", () => {
    expect(getVerificationOutcome(basePayment, "TX-1", goodResult)).toBe("PAID");
  });

  it("returns FAILED and PENDING answers as they are", () => {
    expect(
      getVerificationOutcome(basePayment, "TX-1", { ...goodResult, status: "FAILED" })
    ).toBe("FAILED");
    expect(
      getVerificationOutcome(basePayment, "TX-1", { ...goodResult, status: "PENDING" })
    ).toBe("PENDING");
  });

  it("rejects a different transaction ID from the gateway", () => {
    expect(
      codeOf(() =>
        getVerificationOutcome(basePayment, "TX-1", {
          ...goodResult,
          transactionId: "TX-2",
        })
      )
    ).toBe("VERIFICATION_MISMATCH");
  });

  it("rejects a transaction that is not the stored one", () => {
    expect(
      codeOf(() => getVerificationOutcome(basePayment, "TX-9", goodResult))
    ).toBe("VERIFICATION_MISMATCH");
    expect(
      codeOf(() =>
        getVerificationOutcome(
          { ...basePayment, gatewayTransactionId: null },
          "TX-1",
          goodResult
        )
      )
    ).toBe("VERIFICATION_MISMATCH");
  });

  it("rejects a PAID answer with the wrong amount or currency", () => {
    expect(
      codeOf(() =>
        getVerificationOutcome(basePayment, "TX-1", { ...goodResult, amount: 1 })
      )
    ).toBe("VERIFICATION_MISMATCH");
    expect(
      codeOf(() =>
        getVerificationOutcome(basePayment, "TX-1", {
          ...goodResult,
          currency: "USD",
        })
      )
    ).toBe("VERIFICATION_MISMATCH");
  });

  it("never treats a REFUNDED answer as a verification", () => {
    expect(
      codeOf(() =>
        getVerificationOutcome(basePayment, "TX-1", {
          ...goodResult,
          status: "REFUNDED",
        })
      )
    ).toBe("VERIFICATION_MISMATCH");
  });
});

const paid: RefundablePayment = {
  status: "PAID",
  method: "JAZZCASH",
  amount: 450,
  gateway: "MOCK",
  gatewayTransactionId: "TX-1",
};

describe("getRefundDecision", () => {
  it("proceeds for a paid gateway payment, with or without an amount", () => {
    expect(getRefundDecision(paid)).toBe("proceed");
    expect(getRefundDecision(paid, 450)).toBe("proceed");
  });

  it("replays an already refunded payment without a gateway call", () => {
    expect(getRefundDecision({ ...paid, status: "REFUNDED" })).toBe("replay");
  });

  it("rejects PENDING and FAILED payments", () => {
    for (const status of ["PENDING", "FAILED"] as const) {
      expect(codeOf(() => getRefundDecision({ ...paid, status }))).toBe(
        "INVALID_STATE"
      );
    }
  });

  it("rejects COD and gateway-less payments", () => {
    expect(codeOf(() => getRefundDecision({ ...paid, method: "COD" }))).toBe(
      "INVALID_STATE"
    );
    expect(codeOf(() => getRefundDecision({ ...paid, gateway: null }))).toBe(
      "INVALID_STATE"
    );
    expect(
      codeOf(() => getRefundDecision({ ...paid, gatewayTransactionId: null }))
    ).toBe("INVALID_STATE");
  });

  it("rejects zero, negative and non-finite amounts", () => {
    for (const amount of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(codeOf(() => getRefundDecision(paid, amount))).toBe(
        "INVALID_AMOUNT"
      );
    }
  });

  it("rejects an amount above the payment", () => {
    expect(codeOf(() => getRefundDecision(paid, 450.01))).toBe(
      "INVALID_AMOUNT"
    );
  });

  it("rejects partial refunds (not tracked by the schema)", () => {
    expect(codeOf(() => getRefundDecision(paid, 100))).toBe("INVALID_AMOUNT");
  });
});

describe("getRefundGatewayOutcome", () => {
  it("accepts a confirmed REFUNDED for our transaction", () => {
    expect(
      codeOf(() =>
        getRefundGatewayOutcome(paid, { status: "REFUNDED", transactionId: "TX-1" })
      )
    ).toBeNull();
    expect(
      codeOf(() => getRefundGatewayOutcome(paid, { status: "REFUNDED" }))
    ).toBe("VERIFICATION_MISMATCH");
  });

  it("rejects any answer that is not REFUNDED", () => {
    for (const status of ["PENDING", "PAID", "FAILED"] as const) {
      expect(codeOf(() => getRefundGatewayOutcome(paid, { status }))).toBe(
        "GATEWAY_ERROR"
      );
    }
  });


  it("rejects missing, empty, and whitespace transaction IDs", () => {
    expect(codeOf(() => getRefundGatewayOutcome(paid, { status: "REFUNDED" }))).toBe(
      "VERIFICATION_MISMATCH"
    );
    expect(
      codeOf(() => getRefundGatewayOutcome(paid, { status: "REFUNDED", transactionId: "" }))
    ).toBe("VERIFICATION_MISMATCH");
    expect(
      codeOf(() => getRefundGatewayOutcome(paid, { status: "REFUNDED", transactionId: "   " }))
    ).toBe("VERIFICATION_MISMATCH");
  });

  it("rejects a refund answer for a different transaction", () => {
    expect(
      codeOf(() =>
        getRefundGatewayOutcome(paid, { status: "REFUNDED", transactionId: "TX-9" })
      )
    ).toBe("VERIFICATION_MISMATCH");
  });
});
