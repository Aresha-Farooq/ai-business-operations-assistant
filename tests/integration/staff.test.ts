import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "../../apps/web/app/api/staff/route";
import {
  updateStaff,
  deactivateStaff,
} from "../../packages/business/staff";
import {
  createStaffTenantFixture,
  cleanupStaffTenantFixture,
} from "./helpers/fixtures";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@business-platform/auth/session", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

describe("Staff API authorization", () => {
  it("prevents STAFF users from viewing staff accounts", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      userId: 4,
      organizationId: 1,
      role: "STAFF",
    });

    const response = await GET();

    expect(response.status).toBe(403);
  });

  it("prevents STAFF users from creating staff accounts", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      userId: 4,
      organizationId: 1,
      role: "STAFF",
    });

    const request = new Request("http://localhost/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Manager",
        email: "test-manager@example.com",
        password: "Password123",
        role: "MANAGER",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
  });
});

describe("Staff account protection", () => {
  it("prevents updating an OWNER account", async () => {
    const fixture = await createStaffTenantFixture("OWNER");

    mocks.getCurrentUser.mockResolvedValue({
    userId: fixture.user.id,
      organizationId: fixture.organization.id,
      role: "MANAGER",
    });

    try {
      await expect(
        updateStaff(fixture.user.id, { name: "Changed Owner" })
      ).rejects.toThrow("You cannot update an owner account.");
    } finally {
      await cleanupStaffTenantFixture(
        fixture.organization.id,
        fixture.user.id
      );
    }
  });

  it("prevents deactivating an OWNER account", async () => {
    const fixture = await createStaffTenantFixture("OWNER");

    mocks.getCurrentUser.mockResolvedValue({
      userId: 999999,
      organizationId: fixture.organization.id,
      role: "MANAGER",
    });

    try {
      await expect(
        deactivateStaff(fixture.user.id)
      ).rejects.toThrow("You cannot deactivate an owner account.");
    } finally {
      await cleanupStaffTenantFixture(
        fixture.organization.id,
        fixture.user.id
      );
    }
  });

  it("prevents changing your own role", async () => {
    const fixture = await createStaffTenantFixture("MANAGER");

    mocks.getCurrentUser.mockResolvedValue({
      userId: fixture.user.id,
      organizationId: fixture.organization.id,
      role: "MANAGER",
    });

    try {
      await expect(
        updateStaff(fixture.user.id, { role: "STAFF" })
      ).rejects.toThrow("You cannot change your own role.");
    } finally {
      await cleanupStaffTenantFixture(
        fixture.organization.id,
        fixture.user.id
      );
    }
  });

  it("prevents deactivating your own account", async () => {
    const fixture = await createStaffTenantFixture("MANAGER");

    mocks.getCurrentUser.mockResolvedValue({
      userId: fixture.user.id,
      organizationId: fixture.organization.id,
      role: "MANAGER",
    });

    try {
      await expect(
        deactivateStaff(fixture.user.id)
      ).rejects.toThrow("You cannot deactivate your own account.");
    } finally {
      await cleanupStaffTenantFixture(
        fixture.organization.id,
        fixture.user.id
      );
    }
  });
});