import { describe, expect, it, vi } from "vitest";
import {
  updateStaff,
  deactivateStaff,
} from "@business-platform/business/staff";
import {
  createStaffTenantFixture,
  cleanupStaffTenantFixture,
} from "./helpers/fixtures";

vi.mock("@business-platform/auth/session", () => ({
  getCurrentUser: vi.fn(async () => ({
    userId: 4,
    organizationId: 1,
    role: "OWNER",
  })),
}));

describe("Staff tenant isolation", () => {
  it("prevents updating staff from another organization", async () => {
    const fixture = await createStaffTenantFixture();

    try {
      await expect(
        updateStaff(fixture.user.id, {
          name: "Unauthorized Update",
        })
      ).rejects.toThrow("Staff member not found.");
    } finally {
      await cleanupStaffTenantFixture(
        fixture.organization.id,
        fixture.user.id
      );
    }
  });

  it("prevents deactivating staff from another organization", async () => {
    const fixture = await createStaffTenantFixture();

    try {
      await expect(
        deactivateStaff(fixture.user.id)
      ).rejects.toThrow(
        "Staff member not found or already inactive."
      );
    } finally {
      await cleanupStaffTenantFixture(
        fixture.organization.id,
        fixture.user.id
      );
    }
  });
});