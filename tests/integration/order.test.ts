
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { db, getDbRuntime } from "@business-platform/database";
import { GET, POST } from "../../apps/web/app/api/orders/route";

const session = vi.hoisted(() => ({
  user: null as null | {
    userId: number;
    organizationId: number;
    role: "MANAGER";
  },
}));

vi.mock("@business-platform/auth/session", () => ({
  requireCurrentUser: vi.fn(async () => session.user),
  getCurrentUser: vi.fn(async () => session.user),
}));

async function run<T>(plan: unknown): Promise<T[]> {
  const runtime = await getDbRuntime();
  return (await runtime.query(plan as never)) as T[];
}

let organizationId: number;
let customerId: number;
let productId: number;
let userId: number;
let createdOrderId: number | undefined;

beforeAll(async () => {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  const [organization] = await run<{ id: number }>(
    db.sql.public.organization
      .insert([{ name: `Order API Test ${unique}` }])
      .returning("id")
      .build()
  );

  if (!organization) {
    throw new Error("Failed to create test organization.");
  }

  organizationId = organization.id;

  const [user] = await run<{ id: number }>(
    db.sql.public.user
      .insert([
        {
          name: "Order API Test Manager",
          email: `order-manager-${unique}@example.test`,
          passwordHash: "test-hash",
          organizationId,
          role: "MANAGER",
          isActive: true,
        },
      ])
      .returning("id")
      .build()
  );

  if (!user) {
    throw new Error("Failed to create test manager.");
  }

  userId = user.id;

  const [customer] = await run<{ id: number }>(
    db.sql.public.customer
      .insert([
        {
          name: "Order API Test Customer",
          email: `order-customer-${unique}@example.test`,
          organizationId,
          isActive: true,
        },
      ])
      .returning("id")
      .build()
  );

  if (!customer) {
    throw new Error("Failed to create test customer.");
  }

  customerId = customer.id;

  const [product] = await run<{ id: number }>(
    db.sql.public.product
      .insert([
        {
          name: "Order API Test Product",
          sku: `ORDER-API-${unique}`,
          purchasePrice: 100,
          salePrice: 150,
          stockQuantity: 10,
          minimumStock: 1,
          organizationId,
          isActive: true,
          isPublished: true,
        },
      ])
      .returning("id")
      .build()
  );

  if (!product) {
    throw new Error("Failed to create test product.");
  }

  productId = product.id;

  session.user = {
    userId,
    organizationId,
    role: "MANAGER",
  };
});

afterAll(async () => {
  if (!organizationId) return;

  if (createdOrderId) {
    await run(
      db.sql.public.orderItem
        .delete()
        .where((f, fns) => fns.eq(f.orderId, createdOrderId!))
        .build()
    );

    await run(
      db.sql.public.payment
        .delete()
        .where((f, fns) =>
          fns.eq(f.organizationId, organizationId)
        )
        .build()
    );

    await run(
      db.sql.public.inventoryMovement
        .delete()
        .where((f, fns) =>
          fns.eq(f.organizationId, organizationId)
        )
        .build()
    );

    await run(
      db.sql.public.order
        .delete()
        .where((f, fns) => fns.eq(f.id, createdOrderId!))
        .build()
    );
  }

  await run(
    db.sql.public.product
      .delete()
      .where((f, fns) => fns.eq(f.id, productId))
      .build()
  );

  await run(
    db.sql.public.customer
      .delete()
      .where((f, fns) => fns.eq(f.id, customerId))
      .build()
  );

  await run(
    db.sql.public.user
      .delete()
      .where((f, fns) => fns.eq(f.id, userId))
      .build()
  );

  await run(
    db.sql.public.organization
      .delete()
      .where((f, fns) => fns.eq(f.id, organizationId))
      .build()
  );
});

describe("Orders API", () => {
  it("creates an order for the current organization", async () => {
    const request = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerId,
        items: [{ productId, quantity: 1 }],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);

    const order = await response.json();

    createdOrderId = order.id;

    expect(order.customerId).toBe(customerId);
    expect(order.organizationId).toBe(organizationId);
    expect(order.items).toHaveLength(1);
    expect(order.totalAmount).toBe(150);
  });

  it("rejects an invalid order", async () => {
    const request = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerId,
        items: [],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);

    const responseData = await response.json();

    expect(responseData.error).toBe("Invalid order data.");
  });

  it("returns orders for the current organization", async () => {
    const response = await GET();

    expect(response.status).toBe(200);

    const orders = await response.json();

    expect(Array.isArray(orders)).toBe(true);

    expect(
      orders.some(
        (order: { organizationId: number }) =>
          order.organizationId === organizationId
      )
    ).toBe(true);
  });
});
