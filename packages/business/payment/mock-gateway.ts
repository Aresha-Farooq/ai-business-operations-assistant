import type {
  PaymentGateway,
  CreateGatewayPaymentInput,
  GatewayPaymentResult,
  VerifiedGatewayPaymentResult,
} from "./gateway.js";

type MockPaymentRecord = {
  transactionId: string;
  paymentId: number;
  amount: number;
  currency: string;
};

type MockRefundRecord = {
  transactionId: string;
  amount: number;
  result: GatewayPaymentResult;
};

export class MockPaymentGateway implements PaymentGateway {
  private static records = new Map<string, MockPaymentRecord>();
  private static refundsByKey = new Map<string, MockRefundRecord>();
  private static refundedTransactions = new Set<string>();
private outcome: "PAID" | "FAILED" | "PENDING";

constructor(options: { outcome?: "PAID" | "FAILED" | "PENDING" } = {}) {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("MockPaymentGateway cannot be used in production.");
  }

  this.outcome = options.outcome ?? "PAID";
}
  static clearRecords() {
    this.records.clear();
    this.refundsByKey.clear();
    this.refundedTransactions.clear();
  }

  static refundCount() {
    return this.refundsByKey.size;
  }

  async createPayment(
    input: CreateGatewayPaymentInput
  ): Promise<GatewayPaymentResult> {
    const transactionId = [
      "MOCK",
      input.paymentId,
      input.amount,
      encodeURIComponent(input.currency),
    ].join(":");

    MockPaymentGateway.records.set(transactionId, {
      transactionId,
      paymentId: input.paymentId,
      amount: input.amount,
      currency: input.currency,
    });

    return {
      status: "PENDING",
      transactionId,
      paymentUrl: `/mock-payment/${input.paymentId}`,
    };
  }

  async verifyPayment(
    transactionId: string
  ): Promise<VerifiedGatewayPaymentResult> {
    const record = MockPaymentGateway.records.get(transactionId);

    if (!record) {
      throw new Error("Unknown mock transaction.");
    }

    return {
     status: this.outcome,
      transactionId,
      amount: record.amount,
      currency: record.currency,
    };
  }

  async refundPayment(
    transactionId: string,
    amount: number,
    idempotencyKey?: string
  ): Promise<GatewayPaymentResult> {
    const record = MockPaymentGateway.records.get(transactionId);

    if (!record) {
      throw new Error("Unknown mock transaction.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Refund amount must be a positive finite number.");
    }

    if (amount !== record.amount) {
      throw new Error("Refund amount does not match the original payment.");
    }

    if (idempotencyKey) {
      const existing = MockPaymentGateway.refundsByKey.get(idempotencyKey);

      if (existing) {
        if (
          existing.transactionId !== transactionId ||
          existing.amount !== amount
        ) {
          throw new Error("Idempotency key was reused with different parameters.");
        }

        return existing.result;
      }
    }

    if (MockPaymentGateway.refundedTransactions.has(transactionId)) {
      throw new Error("Mock transaction has already been refunded.");
    }

    const result: GatewayPaymentResult = {
      status: "REFUNDED",
      transactionId,
    };

    MockPaymentGateway.refundedTransactions.add(transactionId);

    if (idempotencyKey) {
      MockPaymentGateway.refundsByKey.set(idempotencyKey, {
        transactionId,
        amount,
        result,
      });
    }

    return result;
  }
}
