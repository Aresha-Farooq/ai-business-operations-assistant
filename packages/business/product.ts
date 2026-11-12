
import {
  db,
  getDbRuntime,
  createAuditLog,
} from "@business-platform/database";

import { requirePermission } from "@business-platform/auth/authorization";

async function writeProductAudit(
  organizationId: number,
  userId: number,
  action: string,
  status: "SUCCESS" | "FAILURE"
) {
  try {
    await createAuditLog({
      organizationId,
      userId,
      action,
      source: "BUSINESS_API",
      toolName: null,
      status,
      errorMessage:
        status === "FAILURE"
          ? "Product operation failed."
          : null,
    });
  } catch (error) {
    console.error("Product audit logging failed:", error);
  }
}

export async function getProducts() {
  const user = await requirePermission("products:read");
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
      "category",
      "imageUrl",
      "isPublished",
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
  category?: string;
  imageUrl?: string;
  isPublished?: boolean;
}) {
  const user = await requirePermission("products:manage");

  try {
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
        minimumStock: 5,
          category: input.category || null,
          imageUrl: input.imageUrl || null,
          isPublished: input.isPublished ?? false,
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
        "category",
        "imageUrl",
        "isPublished",
        "organizationId",
        "createdAt",
        "updatedAt"
      )
      .build();

    const products = await runtime.query(plan);
    const product = products[0];

    if (!product) {
      throw new Error("Product creation failed.");
    }

    await writeProductAudit(
      user.organizationId,
      user.userId,
      "PRODUCT_CREATED",
      "SUCCESS"
    );

    return product;
  } catch (error) {
    await writeProductAudit(
      user.organizationId,
      user.userId,
      "PRODUCT_CREATED",
      "FAILURE"
    );

    throw error;
  }
}

export async function getProductById(productId: number) {
  const user = await requirePermission("products:read");
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
      "category",
      "imageUrl",
      "isPublished",
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
        fns.eq(fields.isActive, true),
        fns.raw`${fields.deletedAt} IS NULL`.returns("pg/bool@1")
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
    category?: string;
    imageUrl?: string | null;
    isPublished?: boolean;
  }
) {
  const user = await requirePermission("products:manage");

  try {
    const existingProduct = await getProductById(productId);

    const finalPurchasePrice =
      input.purchasePrice ?? existingProduct.purchasePrice;

    const finalSalePrice =
      input.salePrice ?? existingProduct.salePrice;

    if (finalSalePrice < finalPurchasePrice) {
      throw new Error(
        "Sale price cannot be lower than purchase price."
      );
    }

    const runtime = await getDbRuntime();

    const plan = db.sql.public.product
      .update({
  ...input,
  minimumStock: undefined,
})
      .where((fields, fns) =>
        fns.and(
          fns.eq(fields.id, productId),
          fns.eq(fields.organizationId, user.organizationId),
          fns.eq(fields.isActive, true),
          fns.raw`${fields.deletedAt} IS NULL`.returns("pg/bool@1")
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
        "category",
        "imageUrl",
        "isPublished",
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

    await writeProductAudit(
      user.organizationId,
      user.userId,
      "PRODUCT_UPDATED",
      "SUCCESS"
    );

    return product;
  } catch (error) {
    await writeProductAudit(
      user.organizationId,
      user.userId,
      "PRODUCT_UPDATED",
      "FAILURE"
    );

    throw error;
  }
}

export async function deleteProduct(productId: number) {
  const user = await requirePermission("products:manage");

  try {
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

    await writeProductAudit(
      user.organizationId,
      user.userId,
      "PRODUCT_DELETED",
      "SUCCESS"
    );

    return product;
  } catch (error) {
    await writeProductAudit(
      user.organizationId,
      user.userId,
      "PRODUCT_DELETED",
      "FAILURE"
    );

    throw error;
  }
}
