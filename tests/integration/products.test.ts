import { describe, expect, it, vi } from "vitest";
import { GET } from "../../apps/web/app/api/products/route";
import {
  createTenantIsolationFixture,
  cleanupTenantIsolationFixture,
} from "./helpers/fixtures";

vi.mock("@business-platform/auth/session", () => ({
  requireCurrentUser: vi.fn(async () => ({
    userId: 4,
    organizationId: 1,
    role: "STAFF",
  })),
}));

describe("GET /api/products", () => {
  it("returns products belonging to the current organization", async () => {
    const response = await GET();

    expect(response.status).toBe(200);

    const responseData = await response.json();

    expect(Array.isArray(responseData.products)).toBe(true);

    const testProduct = responseData.products.find(
      (product: { id: number }) => product.id === 2
    );

    expect(testProduct).toBeDefined();
    expect(testProduct.organizationId).toBe(1);
  });

  it("does not return products from another organization", async () => {
    const fixture = await createTenantIsolationFixture();

    try {
      const response = await GET();

      expect(response.status).toBe(200);

      const responseData = await response.json();

      const leakedProduct = responseData.products.find(
        (product: { id: number }) =>
          product.id === fixture.product.id
      );

      expect(leakedProduct).toBeUndefined();
    } finally {
      await cleanupTenantIsolationFixture(
        fixture.organization.id,
        fixture.product.id
      );
    }
  });
});