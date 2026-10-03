import { describe, expect, it, vi } from "vitest";
import { requireRole } from "../../packages/auth/authorization";
import { getCurrentUser } from "../../packages/auth/session";

vi.mock("../../packages/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

describe("requireRole", () => {
  it("allows a user with an allowed role", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      userId: 1,
      organizationId: 1,
      role: "OWNER",
    });

    const user = await requireRole(["OWNER"]);

    expect(user.role).toBe("OWNER");
  });

  it("rejects a user with a disallowed role", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      userId: 2,
      organizationId: 1,
      role: "STAFF",
    });

    await expect(
      requireRole(["OWNER"])
    ).rejects.toThrow("Forbidden.");
  });

  it("rejects an unauthenticated user", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    await expect(
      requireRole(["OWNER"])
    ).rejects.toThrow("Not authenticated.");
  });
});