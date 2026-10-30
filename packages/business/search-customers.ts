import { db, getDbRuntime } from "@business-platform/database";
import { requireCurrentUser } from "@business-platform/auth/session";

export async function searchCustomers(searchTerm: string) {
  if (typeof searchTerm !== "string" || searchTerm.trim().length < 2) {
    throw new Error("Search term must contain at least 2 characters.");
  }

  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();
  const term = `%${searchTerm.trim()}%`;

  const plan = db.sql.public.customer
    .select(
      "id",
      "name",
      "email",
      "phone",
      "organizationId",
      "isActive"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.organizationId, user.organizationId),
        fns.eq(fields.isActive, true),
        fns.or(
          fns.ilike(fields.name, term),
          fns.ilike(fields.email, term)
        )
      )
    )
    .build();

  return runtime.query(plan);
}
