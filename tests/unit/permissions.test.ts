import { describe, expect, it } from "vitest";
import {
  rolePermissions,
  roleHasPermission,
  type Permission,
  type UserRole,
} from "../../packages/auth/permissions";

const ALL_PERMISSIONS: Permission[] = [
  "customers:read",
  "customers:manage",
  "orders:read",
  "orders:manage",
  "inventory:read",
  "inventory:manage",
  "products:read",
  "products:manage",
  "payments:manage",
  "sales:read",
  "employees:manage",
  "settings:manage",
  "invoices:read",
  "audit:read",
];

// Expected matrix, written out explicitly so a change to the real matrix
// has to be a deliberate change here too.
const EXPECTED: Record<UserRole, Permission[]> = {
  OWNER: ALL_PERMISSIONS,
  MANAGER: ALL_PERMISSIONS.filter(
    (p) => p !== "settings:manage" && p !== "audit:read"
  ),
  STAFF: [
    "customers:read",
    "orders:read",
    "inventory:read",
    "products:read",
  ],
};

describe("role permission matrix", () => {
  for (const role of ["OWNER", "MANAGER", "STAFF"] as UserRole[]) {
    for (const permission of ALL_PERMISSIONS) {
      const expected = EXPECTED[role].includes(permission);

      it(`${role} ${expected ? "has" : "does not have"} ${permission}`, () => {
        expect(roleHasPermission(role, permission)).toBe(expected);
      });
    }
  }

  it("denies an unknown role everything", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(roleHasPermission("HACKER", permission)).toBe(false);
      expect(roleHasPermission("", permission)).toBe(false);
    }
  });

  it("never grants a manage permission without its read counterpart", () => {
    const pairs: [Permission, Permission][] = [
      ["customers:manage", "customers:read"],
      ["orders:manage", "orders:read"],
      ["inventory:manage", "inventory:read"],
      ["products:manage", "products:read"],
    ];

    for (const role of Object.keys(rolePermissions) as UserRole[]) {
      for (const [manage, read] of pairs) {
        if (roleHasPermission(role, manage)) {
          expect(roleHasPermission(role, read)).toBe(true);
        }
      }
    }
  });
});
