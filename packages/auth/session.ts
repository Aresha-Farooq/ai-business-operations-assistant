
import { cookies } from "next/headers";
import { verifyAccessToken } from "./jwt";
import { db, getDbRuntime } from "@business-platform/database";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return null;
  }

  let tokenUser;

  try {
    tokenUser = await verifyAccessToken(token);
  } catch {
    return null;
  }

  const runtime = await getDbRuntime();

  const userPlan = db.sql.public.user
    .select("id", "organizationId", "role", "isActive")
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, tokenUser.userId),
        fns.eq(fields.organizationId, tokenUser.organizationId),
        fns.eq(fields.isActive, true)
      )
    )
    .build();

  const users = await runtime.query(userPlan);
  const user = users[0];

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  };
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  return user;
}
