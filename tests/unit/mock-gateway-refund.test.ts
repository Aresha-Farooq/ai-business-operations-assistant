import { beforeEach, describe, expect, it } from "vitest";
import { MockPaymentGateway } from "../../packages/business/payment/mock-gateway";

describe("MockPaymentGateway refunds", () => {
  let gateway: MockPaymentGateway;
  let transactionId: string;

  beforeEach(async () => {
    MockPaymentGateway.clearRecords();
    gateway = new MockPaymentGateway();
    const created = await gateway.createPayment({
      paymentId: 42,
      orderId: 7,
      amount: 450,
      currency: "PKR",
    });
    transactionId = created.transactionId!;
  });

  it("rejects an unknown transaction", async () => {
    await expect(gateway.refundPayment("MOCK:unknown", 450, "key-1")).rejects.toThrow(
      "Unknown mock transaction"
    );
  });

  it("rejects a mismatched refund amount", async () => {
    await expect(gateway.refundPayment(transactionId, 100, "key-1")).rejects.toThrow(
      "does not match"
    );
  });

  it("rejects non-positive and non-finite amounts", async () => {
    for (const amount of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(gateway.refundPayment(transactionId, amount, "key-1")).rejects.toThrow();
    }
  });

  it("returns the same result for a repeated idempotency key", async () => {
    const first = await gateway.refundPayment(transactionId, 450, "refund-42");
    const second = await gateway.refundPayment(transactionId, 450, "refund-42");
    expect(second).toEqual(first);
    expect(MockPaymentGateway.refundCount()).toBe(1);
  });

  it("rejects reusing an idempotency key with different parameters", async () => {
    await gateway.refundPayment(transactionId, 450, "refund-42");
    await expect(gateway.refundPayment("other", 450, "refund-42")).rejects.toThrow();
  });

  it("does not allow a second refund with a different key", async () => {
    await gateway.refundPayment(transactionId, 450, "refund-42");
    await expect(gateway.refundPayment(transactionId, 450, "refund-43")).rejects.toThrow(
      "already been refunded"
    );
    expect(MockPaymentGateway.refundCount()).toBe(1);
  });
});
