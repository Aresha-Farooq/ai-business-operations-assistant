import { db, getDbRuntime } from "@business-platform/database";
import { requireCurrentUser } from "@business-platform/auth/session";

export async function getProducts() {
const user = await requireCurrentUser();

 
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
  "isActive",
  "deletedAt",
  "createdAt",
  "updatedAt"
)
    .where((fields, fns) =>
  fns.and(
    fns.eq(fields.organizationId, user.organizationId),
    fns.eq(fields.isActive, true)
  )
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
const user = await requireCurrentUser();

 
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

export async function getProductById(productId: number) {
  const user = await requireCurrentUser();
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
      "isActive",
      "deletedAt",
      "createdAt",
      "updatedAt"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, productId),
        fns.eq(fields.organizationId, user.organizationId),
        fns.eq(fields.isActive, true)
      )
    )
    .build();

  const products = await runtime.query(plan);

  const product = products[0];

  if (!product) {
    throw new Error("Product not found.");
  }

  return product;
}
export async function updateProduct(
  productId: number,
  input: {
    name?: string;
    description?: string;
    sku?: string;
    purchasePrice?: number;
    salePrice?: number;
    minimumStock?: number;
  }
) {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  const plan = db.sql.public.product
    .update(input)
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, productId),
        fns.eq(fields.organizationId, user.organizationId),
        fns.eq(fields.isActive, true)
      )
    )
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
      "isActive",
      "deletedAt",
      "createdAt",
      "updatedAt"
    )
    .build();

  const products = await runtime.query(plan);

  const product = products[0];

  if (!product) {
    throw new Error("Product not found.");
  }

  return product;
}
export async function deleteProduct(productId: number) {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  const plan = db.sql.public.product
    .update({
      isActive: false,
      deletedAt: new Date(),
    })
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, productId),
        fns.eq(fields.organizationId, user.organizationId),
        fns.eq(fields.isActive, true)
      )
    )
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
      "isActive",
      "deletedAt",
      "createdAt",
      "updatedAt"
    )
    .build();

  const products = await runtime.query(plan);

  const product = products[0];

  if (!product) {
    throw new Error("Product not found.");
  }

  return product;
}