import { getCurrentUser } from "./session";

export async function requireOrganizationAccess(
  organizationId: number
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  if (user.organizationId !== organizationId) {
    throw new Error("Forbidden.");
  }

  return user;
}