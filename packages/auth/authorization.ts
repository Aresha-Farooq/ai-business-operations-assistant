import { getCurrentUser } from "./session";

import {
  roleHasPermission,
  type Permission,
  type UserRole,
} from "./permissions";

export type { Permission, UserRole } from "./permissions";

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

  if (!roleHasPermission(user.role, permission)) {
    throw new Error("Forbidden.");
  }

  return user;
}
