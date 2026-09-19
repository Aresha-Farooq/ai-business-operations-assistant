import { getCurrentUser } from "./session";

export type UserRole = "OWNER" | "MANAGER" | "STAFF";

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

