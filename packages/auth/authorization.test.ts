import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCurrentUser } from "./session";
import { requirePermission } from "./authorization";

vi.mock("./session", () => ({
  getCurrentUser: vi.fn(),
}));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

describe("Staff management permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows OWNER to manage employees", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      userId: 1,
      organizationId: 1,
      role: "OWNER",
    });

    const user = await requirePermission("employees:manage");

    expect(user.role).toBe("OWNER");
  });

  it("allows MANAGER to manage employees", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      userId: 2,
      organizationId: 1,
      role: "MANAGER",
    });

    const user = await requirePermission("employees:manage");

    expect(user.role).toBe("MANAGER");
  });

  it("rejects STAFF from managing employees", async () => {
    mockedGetCurrentUser.mockResolvedValue({
      userId: 3,
      organizationId: 1,
      role: "STAFF",
    });

    await expect(
      requirePermission("employees:manage")
    ).rejects.toThrow("Forbidden.");
  });
});