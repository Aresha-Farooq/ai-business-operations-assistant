import { db, getDbRuntime } from "@business-platform/database";
import { getCurrentUser } from "@business-platform/auth/session";

export async function getLowStockProducts() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const runtime = await getDbRuntime();

  const productsPlan = db.sql.public.product
    .select(
      "id",
      "name",
      "sku",
      "stockQuantity",
      "minimumStock",
      "organizationId"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.organizationId, user.organizationId),
        fns.lte(fields.stockQuantity, fields.minimumStock)
      )
    )
    .build();

  const products = await runtime.query(productsPlan);

  return products;
}