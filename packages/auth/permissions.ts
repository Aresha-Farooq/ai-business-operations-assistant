// Pure permission matrix. No imports on purpose, so it can be unit-tested
// without a database, cookies or Next.js runtime.

export type UserRole = "OWNER" | "MANAGER" | "STAFF";

export type Permission =
  | "customers:read"
  | "customers:manage"
  | "orders:read"
  | "orders:manage"
  | "inventory:read"
  | "inventory:manage"
  | "products:read"
  | "products:manage"
  | "payments:manage"
  | "sales:read"
  | "employees:manage"
  | "settings:manage"
  | "invoices:read"
  | "audit:read";

export const rolePermissions: Record<UserRole, readonly Permission[]> = {
  OWNER: [
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
  ],

  MANAGER: [
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
    "invoices:read",
  ],

  STAFF: [
    "customers:read",
    "orders:read",
    "inventory:read",
    "products:read",
  ],
};

export function roleHasPermission(
  role: string,
  permission: Permission
): boolean {
  const permissions = rolePermissions[role as UserRole];
  return permissions ? permissions.includes(permission) : false;
}
