import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MockPaymentGateway } from "../../packages/business/payment/mock-gateway";

describe("MockPaymentGateway", () => {
  beforeEach(() => {
    MockPaymentGateway.clearRecords();
  });

  afterEach(() => {
    process.env["NODE_ENV"] = "test";
  });

  it("creates a PENDING transaction and verifies it from its own record", async () => {
    const gateway = new MockPaymentGateway();

    const created = await gateway.createPayment({
      paymentId: 5,
      amount: 450,
      currency: "PKR",
      orderId: 9,
    });

    expect(created.status).toBe("PENDING");
    expect(created.transactionId).toBeTruthy();

    const verified = await gateway.verifyPayment(created.transactionId!);

    expect(verified).toEqual({
      status: "PAID",
      transactionId: created.transactionId,
      amount: 450,
      currency: "PKR",
    });
  });

  it("rejects hand-made transaction IDs (forgery)", async () => {
    const gateway = new MockPaymentGateway();

    await expect(
      gateway.verifyPayment("MOCK:5:450:PKR")
    ).rejects.toThrow("Unknown mock transaction.");
  });

  it("can simulate a failed or still-pending customer payment", async () => {
    for (const outcome of ["FAILED", "PENDING"] as const) {
      const gateway = new MockPaymentGateway({ outcome });
      const created = await gateway.createPayment({
        paymentId: 1,
        amount: 10,
        currency: "PKR",
        orderId: 1,
      });
      const verified = await gateway.verifyPayment(created.transactionId!);
      expect(verified.status).toBe(outcome);
    }
  });

  it("refuses to run in production", () => {
    process.env["NODE_ENV"] = "production";
    expect(() => new MockPaymentGateway()).toThrow("production");
  });
});
