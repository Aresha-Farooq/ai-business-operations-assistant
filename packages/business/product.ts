import { db, getDbRuntime } from "@business-platform/database";
import { getCurrentUser } from "@business-platform/auth/session";

export async function getProducts() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const runtime = await getDbRuntime();

  const plan = db.sql.public.product
    .select(
      "id",
      "name",
      "description",
      "sku",
      "purchasePrice",
      "salePrice",
      "stockQuantity",
      "minimumStock",
      "organizationId",
      "createdAt",
      "updatedAt"
    )
    .where((fields, fns) =>
      fns.eq(fields.organizationId, user.organizationId)
    )
    .build();

  return runtime.query(plan);
}
export async function createProduct(input: {
  name: string;
  description?: string;
  sku: string;
  purchasePrice: number;
  salePrice: number;
  stockQuantity?: number;
  minimumStock?: number;
}) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const runtime = await getDbRuntime();

  const plan = db.sql.public.product
    .insert([
      {
        name: input.name,
        description: input.description ?? null,
        sku: input.sku,
        purchasePrice: input.purchasePrice,
        salePrice: input.salePrice,
        stockQuantity: input.stockQuantity ?? 0,
        minimumStock: input.minimumStock ?? 0,
        organizationId: user.organizationId,
      },
    ])
    .returning(
      "id",
      "name",
      "description",
      "sku",
      "purchasePrice",
      "salePrice",
      "stockQuantity",
      "minimumStock",
      "organizationId",
      "createdAt",
      "updatedAt"
    )
    .build();

  const products = await runtime.query(plan);

  return products[0];
}