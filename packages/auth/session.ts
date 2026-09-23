import { cookies } from "next/headers";
import { verifyAccessToken } from "./jwt";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}
export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  return user;
}