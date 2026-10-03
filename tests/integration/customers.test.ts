import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../apps/web/app/api/customers/route";

vi.mock("@business-platform/auth/session", () => ({
  requireCurrentUser: vi.fn(async () => ({
    userId: 4,
    organizationId: 1,
    role: "STAFF",
  })),
}));

describe("Customers API", () => {
  it("returns customers belonging to the current organization", async () => {
    const response = await GET();

    expect(response.status).toBe(200);

    const responseData = await response.json();

    expect(Array.isArray(responseData.customers)).toBe(true);

    const customer = responseData.customers.find(
      (customer: { organizationId: number }) =>
        customer.organizationId === 1
    );

    expect(customer).toBeDefined();
  });

  it("creates a customer for the current organization", async () => {
    const request = new Request("http://localhost/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Test Customer ${Date.now()}`,
        email: `test-${Date.now()}@example.com`,
        phone: "03001234567",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);

    const responseData = await response.json();

    expect(responseData.customer).toBeDefined();
    expect(responseData.customer.organizationId).toBe(1);
  });

  it("rejects invalid customer data", async () => {
    const request = new Request("http://localhost/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "",
        email: "invalid-email",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);

    const responseData = await response.json();

    expect(responseData.error).toBe("Validation failed.");
  });
});