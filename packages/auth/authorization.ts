import { getCurrentUser } from "./session";

export type UserRole = "OWNER" | "MANAGER" | "STAFF";

export type Permission =
  | "customers:read"
  | "customers:manage"
  | "orders:read"
  | "orders:manage"
  | "inventory:read"
  | "inventory:manage"
  | "sales:read"
  | "employees:manage"
  | "settings:manage"
  | "invoices:read";

const rolePermissions: Record<UserRole, Permission[]> = {
  OWNER: [
    "customers:read",
    "customers:manage",
    "orders:read",
    "orders:manage",
    "inventory:read",
    "inventory:manage",
    "sales:read",
    "employees:manage",
    "settings:manage",
    "invoices:read",
  ],

  MANAGER: [
    "customers:read",
    "customers:manage",
    "orders:read",
    "orders:manage",
    "inventory:read",
    "inventory:manage",
    "sales:read",
    "invoices:read",
  ],

  STAFF: [
    "customers:read",
    "orders:read",
    "inventory:read",
  ],
};

export async function requireRole(
  allowedRoles: UserRole[]
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  if (!allowedRoles.includes(user.role as UserRole)) {
    throw new Error("Forbidden.");
  }

  return user;
}

export async function requirePermission(
  permission: Permission
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const role = user.role as UserRole;

  if (!rolePermissions[role]?.includes(permission)) {
    throw new Error("Forbidden.");
  }

  return user;
}