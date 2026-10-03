import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../apps/web/app/api/orders/route";

vi.mock("@business-platform/auth/session", () => ({
  requireCurrentUser: vi.fn(async () => ({
    userId: 4,
    organizationId: 1,
    role: "STAFF",
  })),
}));

describe("Orders API", () => {
  it("creates an order for the current organization", async () => {
    const request = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerId: 3,
        items: [
          {
            productId: 2,
            quantity: 1,
          },
        ],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);

    const order = await response.json();

    expect(order).toBeDefined();
    expect(order.customerId).toBe(3);
    expect(order.organizationId).toBe(1);
    expect(order.items).toBeDefined();
    expect(order.items.length).toBe(1);
  });

  it("rejects an invalid order", async () => {
    const request = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerId: 3,
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

    const organizationOrder = orders.find(
      (order: { organizationId: number }) =>
        order.organizationId === 1
    );

    expect(organizationOrder).toBeDefined();
  });
});