
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, getDbRuntime } from "@business-platform/database";
import { createGuestCheckoutOrder } from "@business-platform/business/guest-checkout";
import type { GuestCheckoutInput } from "@business-platform/validation/checkout";

async function run<T>(plan: unknown): Promise<T[]> {
  const runtime = await getDbRuntime();
  return (await runtime.query(plan as never)) as T[];
}

let organizationId: number | undefined;
let productId: number | undefined;
let storefrontSlug: string;

const INITIAL_STOCK = 1;
const PRODUCT_PRICE = 250;

beforeAll(async () => {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  storefrontSlug = `checkout-test-${unique}`;

  const [organization] = await run<{ id: number }>(
    db.sql.public.organization
      .insert([
        {
          name: `Checkout Concurrency Test ${unique}`,
          slug: storefrontSlug,
        },
      ])
      .returning("id")
      .build()
  );

  if (!organization) {
    throw new Error("Failed to create test organization.");
  }

  organizationId = organization.id;

  const [product] = await run<{ id: number }>(
    db.sql.public.product
      .insert([
        {
          name: "Concurrency Test Product",
          sku: `CHECKOUT-${unique}`,
          purchasePrice: 100,
          salePrice: PRODUCT_PRICE,
          stockQuantity: INITIAL_STOCK,
          minimumStock: 0,
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
});

afterAll(async () => {
  if (!organizationId) return;

  // Find all orders created for this test organization.
  const orders = await run<{ id: number }>(
    db.sql.public.order
      .select("id")
      .where((f, fns) =>
        fns.eq(f.organizationId, organizationId!)
      )
      .build()
  );

  const orderIds = orders.map((order) => order.id);

  // Delete dependent records before their parent records.
  await run(
    db.sql.public.inventoryMovement
      .delete()
      .where((f, fns) =>
        fns.eq(f.organizationId, organizationId!)
      )
      .build()
  );

  await run(
    db.sql.public.payment
      .delete()
      .where((f, fns) =>
        fns.eq(f.organizationId, organizationId!)
      )
      .build()
  );

  if (orderIds.length > 0) {
    await run(
      db.sql.public.orderItem
        .delete()
        .where((f, fns) =>
          fns.in(f.orderId, orderIds)
        )
        .build()
    );

    await run(
      db.sql.public.order
        .delete()
        .where((f, fns) =>
          fns.in(f.id, orderIds)
        )
        .build()
    );
  }

  await run(
    db.sql.public.customer
      .delete()
      .where((f, fns) =>
        fns.eq(f.organizationId, organizationId!)
      )
      .build()
  );

  await run(
    db.sql.public.product
      .delete()
      .where((f, fns) =>
        fns.eq(f.organizationId, organizationId!)
      )
      .build()
  );

  await run(
    db.sql.public.organization
      .delete()
      .where((f, fns) =>
        fns.eq(f.id, organizationId!)
      )
      .build()
  );
});

function checkoutInput(email: string): GuestCheckoutInput {
  return {
    name: "Concurrency Test Customer",
    email,
    phone: "03001234567",
    address: "123 Test Street",
    city: "Karachi",
    deliveryInstructions: "Integration test",
    items: [
      {
        productId: productId!,
        quantity: 1,
      },
    ],
    paymentMethod: "COD",
  };
}

describe("guest checkout: concurrent inventory protection", () => {
  it("allows only one simultaneous checkout for the last unit and rolls back the losing transaction", async () => {
    const unique = `${Date.now()}`;

    const results = await Promise.allSettled([
      createGuestCheckoutOrder(
        storefrontSlug,
        checkoutInput(`checkout-a-${unique}@example.test`)
      ),
      createGuestCheckoutOrder(
        storefrontSlug,
        checkoutInput(`checkout-b-${unique}@example.test`)
      ),
    ]);

    const successful = results.filter(
      (result) => result.status === "fulfilled"
    );

    const failed = results.filter(
      (result) => result.status === "rejected"
    );

    // Exactly one customer can purchase the final unit.
    expect(successful).toHaveLength(1);
    expect(failed).toHaveLength(1);

    // Stock must never become negative.
    const products = await run<{ stockQuantity: number }>(
      db.sql.public.product
        .select("stockQuantity")
        .where((f, fns) =>
          fns.and(
            fns.eq(f.id, productId!),
            fns.eq(f.organizationId, organizationId!)
          )
        )
        .build()
    );

    expect(products[0]?.stockQuantity).toBe(0);

    // Exactly one order should exist.
    const orders = await run<{ id: number }>(
      db.sql.public.order
        .select("id")
        .where((f, fns) =>
          fns.eq(f.organizationId, organizationId!)
        )
        .build()
    );

    expect(orders).toHaveLength(1);

    // The losing transaction must not leave a customer behind.
    const customers = await run<{ id: number }>(
      db.sql.public.customer
        .select("id")
        .where((f, fns) =>
          fns.eq(f.organizationId, organizationId!)
        )
        .build()
    );

    expect(customers).toHaveLength(1);

    // Only the successful order should have an order item.
    const orderItems = await run<{ id: number }>(
      db.sql.public.orderItem
        .select("id")
        .where((f, fns) =>
          fns.eq(f.orderId, orders[0]!.id)
        )
        .build()
    );

    expect(orderItems).toHaveLength(1);

    // Only one payment should have been created.
    const payments = await run<{ id: number }>(
      db.sql.public.payment
        .select("id")
        .where((f, fns) =>
          fns.eq(f.organizationId, organizationId!)
        )
        .build()
    );

    expect(payments).toHaveLength(1);

    // Only one SALE movement should exist.
    const movements = await run<{
      id: number;
      quantity: number;
      type: string;
    }>(
      db.sql.public.inventoryMovement
        .select("id", "quantity", "type")
        .where((f, fns) =>
          fns.and(
            fns.eq(f.organizationId, organizationId!),
            fns.eq(f.productId, productId!)
          )
        )
        .build()
    );

    expect(movements).toHaveLength(1);
    expect(movements[0]!.quantity).toBe(-1);
    expect(movements[0]!.type).toBe("SALE");
  });
});
