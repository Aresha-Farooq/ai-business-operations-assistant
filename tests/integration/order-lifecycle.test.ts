import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db, getDbRuntime } from "@business-platform/database";
import { updateOrderStatus } from "@business-platform/business/update-order-status";
import { updateShippingStatus } from "@business-platform/business/update-shipping-status";

// Runs against the real development database (like the other integration
// tests). Creates two throw-away organizations and removes them afterwards.

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

type Ids = {
  orgA: number;
  orgB: number;
  userA: number;
  userB: number;
  customerA: number;
  productA: number;
};

let ids: Ids;
const createdOrderIds: number[] = [];
const INITIAL_STOCK = 10;
const ORDER_QTY = 3;

async function run<T>(plan: unknown): Promise<T[]> {
  const runtime = await getDbRuntime();
  return (await runtime.query(plan as never)) as T[];
}

async function insertOrg(label: string) {
  const [org] = await run<{ id: number }>(
    db.sql.public.organization
      .insert([{ name: `Lifecycle ${label} ${Date.now()}` }])
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
          name: `Lifecycle ${label}`,
          email: `lifecycle-${label}-${Date.now()}@example.test`,
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

// A PENDING order of ORDER_QTY units whose stock was already deducted,
// exactly like checkout leaves it, plus a pending COD payment.
async function createPendingOrder() {
  await run(
    db.sql.public.product
      .update({ stockQuantity: INITIAL_STOCK - ORDER_QTY })
      .where((f, fns) => fns.eq(f.id, ids.productA))
      .returning("id")
      .build()
  );

  const [order] = await run<{ id: number }>(
    db.sql.public.order
      .insert([
        {
          customerId: ids.customerA,
          organizationId: ids.orgA,
          status: "PENDING",
          shippingStatus: "NOT_SHIPPED",
          totalAmount: 150 * ORDER_QTY,
        },
      ])
      .returning("id")
      .build()
  );

  await run(
    db.sql.public.orderItem
      .insert([
        {
          orderId: order!.id,
          productId: ids.productA,
          quantity: ORDER_QTY,
          unitPrice: 150,
        },
      ])
      .returning("id")
      .build()
  );

  await run(
    db.sql.public.payment
      .insert([
        {
          orderId: order!.id,
          organizationId: ids.orgA,
          amount: 150 * ORDER_QTY,
          currency: "PKR",
          method: "COD",
          status: "PENDING",
          gateway: null,
          gatewayTransactionId: null,
        },
      ])
      .returning("id")
      .build()
  );

  createdOrderIds.push(order!.id);
  return order!.id;
}

async function readOrder(orderId: number) {
  const [order] = await run<{ status: string; shippingStatus: string }>(
    db.sql.public.order
      .select("status", "shippingStatus")
      .where((f, fns) => fns.eq(f.id, orderId))
      .build()
  );
  return order!;
}

async function readStock() {
  const [product] = await run<{ stockQuantity: number }>(
    db.sql.public.product
      .select("stockQuantity")
      .where((f, fns) => fns.eq(f.id, ids.productA))
      .build()
  );
  return product!.stockQuantity;
}

async function readPaymentStatus(orderId: number) {
  const [payment] = await run<{ status: string }>(
    db.sql.public.payment
      .select("status")
      .where((f, fns) => fns.eq(f.orderId, orderId))
      .build()
  );
  return payment!.status;
}

function loginAs(
  organizationId: number,
  userId: number,
  role: "OWNER" | "MANAGER" | "STAFF" = "MANAGER"
) {
  session.user = { userId, organizationId, role };
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
          name: "Lifecycle Customer",
          email: `customer-${Date.now()}@example.test`,
          organizationId: orgA,
          isActive: true,
        },
      ])
      .returning("id")
      .build()
  );

  const [product] = await run<{ id: number }>(
    db.sql.public.product
      .insert([
        {
          name: "Lifecycle Product",
          sku: `LIFECYCLE-${Date.now()}`,
          purchasePrice: 100,
          salePrice: 150,
          stockQuantity: INITIAL_STOCK - ORDER_QTY,
          minimumStock: 1,
          organizationId: orgA,
        },
      ])
      .returning("id")
      .build()
  );

  ids = {
    orgA,
    orgB,
    userA,
    userB,
    customerA: customer!.id,
    productA: product!.id,
  };
});

beforeEach(() => {
  loginAs(ids.orgA, ids.userA);
});

afterAll(async () => {
  if (!ids) return;

  const del = async (plan: unknown) => run(plan);

  for (const orgId of [ids.orgA, ids.orgB]) {
    await del(
      db.sql.public.inventoryMovement
        .delete()
        .where((f, fns) => fns.eq(f.organizationId, orgId))
        .build()
    );
    await del(
      db.sql.public.payment
        .delete()
        .where((f, fns) => fns.eq(f.organizationId, orgId))
        .build()
    );
  }

  for (const orderId of createdOrderIds) {
    await del(
      db.sql.public.orderItem
        .delete()
        .where((f, fns) => fns.eq(f.orderId, orderId))
        .build()
    );
    await del(
      db.sql.public.order
        .delete()
        .where((f, fns) => fns.eq(f.id, orderId))
        .build()
    );
  }

  await del(
    db.sql.public.auditLog
      .delete()
      .where((f, fns) => fns.in(f.organizationId, [ids.orgA, ids.orgB]))
      .build()
  );
  await del(
    db.sql.public.product
      .delete()
      .where((f, fns) => fns.eq(f.id, ids.productA))
      .build()
  );
  await del(
    db.sql.public.customer
      .delete()
      .where((f, fns) => fns.eq(f.id, ids.customerA))
      .build()
  );
  await del(
    db.sql.public.user
      .delete()
      .where((f, fns) => fns.in(f.id, [ids.userA, ids.userB]))
      .build()
  );
  await del(
    db.sql.public.organization
      .delete()
      .where((f, fns) => fns.in(f.id, [ids.orgA, ids.orgB]))
      .build()
  );
});

describe("order lifecycle: access control", () => {
  it("STAFF cannot change order or shipping status", async () => {
    const orderId = await createPendingOrder();
    loginAs(ids.orgA, ids.userA, "STAFF");

    await expect(
      updateOrderStatus({ orderId, status: "CONFIRMED" })
    ).rejects.toThrow("Forbidden.");
    await expect(
      updateShippingStatus({ orderId, shippingStatus: "SHIPPED" })
    ).rejects.toThrow("Forbidden.");

    expect((await readOrder(orderId)).status).toBe("PENDING");
  });

  it("another organization cannot see or change the order", async () => {
    const orderId = await createPendingOrder();
    loginAs(ids.orgB, ids.userB);

    await expect(
      updateOrderStatus({ orderId, status: "CONFIRMED" })
    ).rejects.toThrow("Order not found.");
    await expect(
      updateOrderStatus({ orderId, status: "CANCELLED" })
    ).rejects.toThrow("Order not found.");
    await expect(
      updateShippingStatus({ orderId, shippingStatus: "SHIPPED" })
    ).rejects.toThrow("Order not found.");

    const order = await readOrder(orderId);
    expect(order.status).toBe("PENDING");
    expect(order.shippingStatus).toBe("NOT_SHIPPED");
    // org B's attempted cancel must not have touched org A's stock
    expect(await readStock()).toBe(INITIAL_STOCK - ORDER_QTY);
  });
});

describe("order lifecycle: valid and invalid transitions", () => {
  it("rejects skipping steps", async () => {
    const orderId = await createPendingOrder();

    await expect(
      updateOrderStatus({ orderId, status: "PROCESSING" })
    ).rejects.toThrow("Cannot change order status");
    await expect(
      updateOrderStatus({ orderId, status: "COMPLETED" })
    ).rejects.toThrow("Cannot change order status");
    await expect(
      updateShippingStatus({ orderId, shippingStatus: "SHIPPED" })
    ).rejects.toThrow("PROCESSING");

    expect((await readOrder(orderId)).status).toBe("PENDING");
  });

  it("runs the full flow and does NOT mark the COD payment as paid", async () => {
    const orderId = await createPendingOrder();

    await updateOrderStatus({ orderId, status: "CONFIRMED" });
    await updateOrderStatus({ orderId, status: "PROCESSING" });

    await expect(
      updateOrderStatus({ orderId, status: "COMPLETED" })
    ).rejects.toThrow("delivered");

    await updateShippingStatus({ orderId, shippingStatus: "SHIPPED" });
    await updateShippingStatus({ orderId, shippingStatus: "DELIVERED" });
    const completed = await updateOrderStatus({ orderId, status: "COMPLETED" });

    expect(completed.status).toBe("COMPLETED");
    expect(completed.shippingStatus).toBe("DELIVERED");
    expect(await readPaymentStatus(orderId)).toBe("PENDING");

    // terminal: nothing can change it any more
    await expect(
      updateOrderStatus({ orderId, status: "CANCELLED" })
    ).rejects.toThrow();
    expect(await readStock()).toBe(INITIAL_STOCK - ORDER_QTY);
  });
});

describe("order lifecycle: cancellation", () => {
  it("restores stock once, records a movement and voids the pending payment", async () => {
    const orderId = await createPendingOrder();
    await updateOrderStatus({ orderId, status: "CONFIRMED" });

    const cancelled = await updateOrderStatus({ orderId, status: "CANCELLED" });

    expect(cancelled.status).toBe("CANCELLED");
    expect(await readStock()).toBe(INITIAL_STOCK);
    expect(await readPaymentStatus(orderId)).toBe("FAILED");

    const movements = await run<{ quantity: number; type: string }>(
      db.sql.public.inventoryMovement
        .select("quantity", "type")
        .where((f, fns) =>
          fns.and(
            fns.eq(f.productId, ids.productA),
            fns.eq(f.organizationId, ids.orgA),
            fns.eq(f.reason, `Order #${orderId} cancelled`)
          )
        )
        .build()
    );
    expect(movements.length).toBe(1);
    expect(movements[0]!.quantity).toBe(ORDER_QTY);
    expect(movements[0]!.type).toBe("RETURN");

    // cancelling again must not restock a second time
    await expect(
      updateOrderStatus({ orderId, status: "CANCELLED" })
    ).rejects.toThrow("already CANCELLED");
    expect(await readStock()).toBe(INITIAL_STOCK);
  });

  it("restocks even if the product was deactivated afterwards", async () => {
    const orderId = await createPendingOrder();

    await run(
      db.sql.public.product
        .update({ isActive: false })
        .where((f, fns) => fns.eq(f.id, ids.productA))
        .returning("id")
        .build()
    );

    try {
      await updateOrderStatus({ orderId, status: "CANCELLED" });
      expect(await readStock()).toBe(INITIAL_STOCK);
    } finally {
      await run(
        db.sql.public.product
          .update({ isActive: true })
          .where((f, fns) => fns.eq(f.id, ids.productA))
          .returning("id")
          .build()
      );
    }
  });

  it("cannot cancel a shipped order, and stock stays unchanged", async () => {
    const orderId = await createPendingOrder();
    await updateOrderStatus({ orderId, status: "CONFIRMED" });
    await updateOrderStatus({ orderId, status: "PROCESSING" });
    await updateShippingStatus({ orderId, shippingStatus: "SHIPPED" });

    await expect(
      updateOrderStatus({ orderId, status: "CANCELLED" })
    ).rejects.toThrow("shipped");

    expect((await readOrder(orderId)).status).toBe("PROCESSING");
    expect(await readStock()).toBe(INITIAL_STOCK - ORDER_QTY);
  });

  it("cannot cancel an order that has a PAID payment", async () => {
    const orderId = await createPendingOrder();

    await run(
      db.sql.public.payment
        .update({ status: "PAID" })
        .where((f, fns) => fns.eq(f.orderId, orderId))
        .returning("id")
        .build()
    );

    await expect(
      updateOrderStatus({ orderId, status: "CANCELLED" })
    ).rejects.toThrow("Refund");

    expect((await readOrder(orderId)).status).toBe("PENDING");
    expect(await readStock()).toBe(INITIAL_STOCK - ORDER_QTY);
  });

  it("two simultaneous cancels restore stock exactly once", async () => {
    const orderId = await createPendingOrder();

    const results = await Promise.allSettled([
      updateOrderStatus({ orderId, status: "CANCELLED" }),
      updateOrderStatus({ orderId, status: "CANCELLED" }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBe(1);
    expect(await readStock()).toBe(INITIAL_STOCK);
  });
});
