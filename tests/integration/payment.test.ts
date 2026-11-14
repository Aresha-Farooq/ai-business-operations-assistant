import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db, getDbRuntime } from "@business-platform/database";
import { createPayment } from "@business-platform/business/payment";
import { verifyPayment } from "@business-platform/business/payment/verify-payment";
import { MockPaymentGateway } from "@business-platform/business/payment/mock-gateway";
import { PaymentError } from "@business-platform/business/payment/payment-rules";
import type { PaymentGateway } from "@business-platform/business/payment/gateway";

// Runs against the real development database (like the other integration
// tests). Creates two throw-away organizations and removes them afterwards.
// Uses the development MockPaymentGateway only; no real gateway is contacted.

const session = vi.hoisted(() => ({
  user: null as null | {
    userId: number;
    organizationId: number;
    role: "OWNER" | "MANAGER" | "STAFF";
  },
}));

vi.mock("@business-platform/auth/session", () => ({
  getCurrentUser: vi.fn(async () => session.user),
  requireCurrentUser: vi.fn(async () => session.user),
}));

const ORDER_TOTAL = 450;

type Ids = {
  orgA: number;
  orgB: number;
  userA: number;
  userB: number;
  customerA: number;
};

let ids: Ids;
const createdOrderIds: number[] = [];

async function run<T>(plan: unknown): Promise<T[]> {
  const runtime = await getDbRuntime();
  return (await runtime.query(plan as never)) as T[];
}

async function insertOrg(label: string) {
  const [org] = await run<{ id: number }>(
    db.sql.public.organization
      .insert([{ name: `Payment ${label} ${Date.now()}` }])
      .returning("id")
      .build()
  );
  return org!.id;
}

async function insertUser(organizationId: number, label: string) {
  const [user] = await run<{ id: number }>(
    db.sql.public.user
      .insert([
        {
          name: `Payment ${label}`,
          email: `payment-${label}-${Date.now()}@example.test`,
          passwordHash: "not-a-real-hash",
          organizationId,
          role: "MANAGER",
        },
      ])
      .returning("id")
      .build()
  );
  return user!.id;
}

async function createOrder(status: "PENDING" | "CANCELLED" = "PENDING") {
  const [order] = await run<{ id: number }>(
    db.sql.public.order
      .insert([
        {
          customerId: ids.customerA,
          organizationId: ids.orgA,
          status,
          shippingStatus: "NOT_SHIPPED",
          totalAmount: ORDER_TOTAL,
        },
      ])
      .returning("id")
      .build()
  );
  createdOrderIds.push(order!.id);
  return order!.id;
}

async function readPayments(orderId: number) {
  return run<{
    id: number;
    status: string;
    amount: number;
    method: string;
    gateway: string | null;
    gatewayTransactionId: string | null;
  }>(
    db.sql.public.payment
      .select("id", "status", "amount", "method", "gateway", "gatewayTransactionId")
      .where((f, fns) => fns.eq(f.orderId, orderId))
      .build()
  );
}

async function auditActions(organizationId: number) {
  const rows = await run<{ action: string; status: string }>(
    db.sql.public.auditLog
      .select("action", "status")
      .where((f, fns) => fns.eq(f.organizationId, organizationId))
      .build()
  );
  return rows;
}

function loginAs(organizationId: number, userId: number) {
  session.user = { userId, organizationId, role: "MANAGER" };
}

async function expectPaymentError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e
  );
  expect(error).toBeInstanceOf(PaymentError);
  expect((error as PaymentError).code).toBe(code);
}

beforeAll(async () => {
  const orgA = await insertOrg("A");
  const orgB = await insertOrg("B");
  const userA = await insertUser(orgA, "a");
  const userB = await insertUser(orgB, "b");

  const [customer] = await run<{ id: number }>(
    db.sql.public.customer
      .insert([
        {
          name: "Payment Customer",
          email: `payment-customer-${Date.now()}@example.test`,
          organizationId: orgA,
          isActive: true,
        },
      ])
      .returning("id")
      .build()
  );

  ids = { orgA, orgB, userA, userB, customerA: customer!.id };
});

beforeEach(() => {
  loginAs(ids.orgA, ids.userA);
  MockPaymentGateway.clearRecords();
});

afterAll(async () => {
  if (!ids) return;

  for (const orgId of [ids.orgA, ids.orgB]) {
    await run(
      db.sql.public.payment
        .delete()
        .where((f, fns) => fns.eq(f.organizationId, orgId))
        .build()
    );
    await run(
      db.sql.public.auditLog
        .delete()
        .where((f, fns) => fns.eq(f.organizationId, orgId))
        .build()
    );
  }

  for (const orderId of createdOrderIds) {
    await run(
      db.sql.public.order
        .delete()
        .where((f, fns) => fns.eq(f.id, orderId))
        .build()
    );
  }

  await run(
    db.sql.public.customer
      .delete()
      .where((f, fns) => fns.eq(f.id, ids.customerA))
      .build()
  );

  for (const userId of [ids.userA, ids.userB]) {
    await run(
      db.sql.public.user
        .delete()
        .where((f, fns) => fns.eq(f.id, userId))
        .build()
    );
  }

  for (const orgId of [ids.orgA, ids.orgB]) {
    await run(
      db.sql.public.organization
        .delete()
        .where((f, fns) => fns.eq(f.id, orgId))
        .build()
    );
  }
});

describe("createPayment", () => {
  it("takes the amount from the order, never from the caller", async () => {
    const orderId = await createOrder();

    // A caller-supplied amount is not part of the input type; even if it
    // were smuggled in, it is not read.
    const result = await createPayment({
      orderId,
      method: "COD",
      amount: 1,
    } as never);

    expect(result.payment.amount).toBe(ORDER_TOTAL);
    expect(result.payment.status).toBe("PENDING");
    expect(result.payment.gateway).toBeNull();
    expect(result.gateway).toBeNull();
    expect(result.idempotentReplay).toBe(false);
  });

  it("returns the same pending payment when the request is repeated", async () => {
    const orderId = await createOrder();

    const first = await createPayment({ orderId, method: "JAZZCASH" });
    const second = await createPayment({ orderId, method: "JAZZCASH" });

    expect(second.payment.id).toBe(first.payment.id);
    expect(second.idempotentReplay).toBe(true);
    expect(await readPayments(orderId)).toHaveLength(1);
  });

  it("creates exactly one payment for simultaneous requests", async () => {
    const orderId = await createOrder();

    const results = await Promise.allSettled([
      createPayment({ orderId, method: "COD" }),
      createPayment({ orderId, method: "COD" }),
      createPayment({ orderId, method: "COD" }),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(await readPayments(orderId)).toHaveLength(1);
  });

  it("rejects a different method while another payment is pending", async () => {
    const orderId = await createOrder();
    await createPayment({ orderId, method: "COD" });

    await expectPaymentError(
      createPayment({ orderId, method: "JAZZCASH" }),
      "CONFLICT"
    );
  });

  it("rejects cancelled orders", async () => {
    const orderId = await createOrder("CANCELLED");

    await expectPaymentError(
      createPayment({ orderId, method: "COD" }),
      "INVALID_STATE"
    );
    expect(await readPayments(orderId)).toHaveLength(0);
  });

  it("cannot create a payment for another organization's order", async () => {
    const orderId = await createOrder();
    loginAs(ids.orgB, ids.userB);

    await expectPaymentError(
      createPayment({ orderId, method: "COD" }),
      "NOT_FOUND"
    );
    expect(await readPayments(orderId)).toHaveLength(0);
  });

  it("marks the payment FAILED when the gateway cannot create it", async () => {
    const orderId = await createOrder();

    const brokenGateway: PaymentGateway = {
      name: "MOCK",
      createPayment: async () => {
        throw new Error("gateway down");
      },
      verifyPayment: async () => {
        throw new Error("not used");
      },
      refundPayment: async () => {
        throw new Error("not used");
      },
    };

    await expectPaymentError(
      createPayment({ orderId, method: "JAZZCASH" }, brokenGateway),
      "GATEWAY_ERROR"
    );

    const payments = await readPayments(orderId);
    expect(payments).toHaveLength(1);
    expect(payments[0]!.status).toBe("FAILED");
    expect(payments[0]!.gatewayTransactionId).toBeNull();

    // A new attempt is possible after a failed one.
    const retry = await createPayment({ orderId, method: "JAZZCASH" });
    expect(retry.payment.status).toBe("PENDING");
    expect(retry.payment.id).not.toBe(payments[0]!.id);
  });

  it("writes an audit log entry", async () => {
    const orderId = await createOrder();
    await createPayment({ orderId, method: "COD" });

    const actions = await auditActions(ids.orgA);
    expect(
      actions.some((a) => a.action.startsWith("PAYMENT_CREATED"))
    ).toBe(true);
  });
});

describe("verifyPayment", () => {
  it("marks a pending gateway payment PAID and is idempotent", async () => {
    const orderId = await createOrder();
    const created = await createPayment({ orderId, method: "JAZZCASH" });
    const transactionId = created.payment.gatewayTransactionId!;

    const first = await verifyPayment(transactionId);
    expect(first.payment.status).toBe("PAID");
    expect(first.idempotentReplay).toBe(false);

    const second = await verifyPayment(transactionId);
    expect(second.payment.status).toBe("PAID");
    expect(second.idempotentReplay).toBe(true);
  });

  it("two simultaneous verifications settle the payment once", async () => {
    const orderId = await createOrder();
    const created = await createPayment({ orderId, method: "JAZZCASH" });
    const transactionId = created.payment.gatewayTransactionId!;

    const results = await Promise.allSettled([
      verifyPayment(transactionId),
      verifyPayment(transactionId),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    const actions = (await auditActions(ids.orgA)).filter((a) =>
      a.action.startsWith("PAYMENT_VERIFIED")
    );
    expect(actions.filter((a) => a.action.includes(`#${created.payment.id} `)))
      .toHaveLength(1);
  });

  it("records a failed gateway payment as FAILED", async () => {
    const orderId = await createOrder();
    const created = await createPayment({ orderId, method: "JAZZCASH" });
    const transactionId = created.payment.gatewayTransactionId!;

    const result = await verifyPayment(
      transactionId,
      new MockPaymentGateway({ outcome: "FAILED" })
    );

    expect(result.payment.status).toBe("FAILED");
  });

  it("leaves the payment PENDING when the gateway has no result yet", async () => {
    const orderId = await createOrder();
    const created = await createPayment({ orderId, method: "JAZZCASH" });
    const transactionId = created.payment.gatewayTransactionId!;

    const result = await verifyPayment(
      transactionId,
      new MockPaymentGateway({ outcome: "PENDING" })
    );

    expect(result.payment.status).toBe("PENDING");
  });

  it("rejects an unknown or forged transaction ID", async () => {
    await expectPaymentError(verifyPayment("MOCK:1:450:PKR"), "NOT_FOUND");
  });

  it("cannot verify another organization's transaction", async () => {
    const orderId = await createOrder();
    const created = await createPayment({ orderId, method: "JAZZCASH" });
    const transactionId = created.payment.gatewayTransactionId!;

    loginAs(ids.orgB, ids.userB);

    await expectPaymentError(verifyPayment(transactionId), "NOT_FOUND");
    expect((await readPayments(orderId))[0]!.status).toBe("PENDING");
  });

  it("does not mark a payment PAID when the gateway amount differs", async () => {
    const orderId = await createOrder();
    const created = await createPayment({ orderId, method: "JAZZCASH" });
    const transactionId = created.payment.gatewayTransactionId!;

    const lyingGateway: PaymentGateway = {
      name: "MOCK",
      createPayment: async () => {
        throw new Error("not used");
      },
      verifyPayment: async () => ({
        status: "PAID",
        transactionId,
        amount: 1,
        currency: "PKR",
      }),
      refundPayment: async () => {
        throw new Error("not used");
      },
    };

    await expectPaymentError(
      verifyPayment(transactionId, lyingGateway),
      "VERIFICATION_MISMATCH"
    );

    expect((await readPayments(orderId))[0]!.status).toBe("PENDING");

    const actions = await auditActions(ids.orgA);
    expect(
      actions.some((a) => a.action.startsWith("PAYMENT_VERIFY_REJECTED"))
    ).toBe(true);
  });

  it("does not verify COD payments", async () => {
    const orderId = await createOrder();
    await createPayment({ orderId, method: "COD" });

    // COD payments have no transaction ID, so nothing can be verified.
    await expectPaymentError(verifyPayment("anything"), "NOT_FOUND");
  });
});
