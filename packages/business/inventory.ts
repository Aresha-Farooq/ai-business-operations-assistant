
import {
  db,
  getDbRuntime,
  createAuditLog,
} from "@business-platform/database";

import { requirePermission } from "@business-platform/auth/authorization";

// --------------------------------------------------
// Types
// --------------------------------------------------

export type ChangeStockInput = {
  productId: number;
  quantity: number;
  type:
    | "PURCHASE"
    | "SALE"
    | "ADJUSTMENT"
    | "RETURN"
    | "DAMAGE";
  adjustmentDirection?: "INCREASE" | "DECREASE";
  reason?: string;
};

type InventoryTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

// --------------------------------------------------
// Apply stock movement inside a transaction
// --------------------------------------------------

export async function applyStockMovement(
  tx: InventoryTransaction,
  input: ChangeStockInput,
  organizationId: number,
  userId: number
) {
  const productPlan = tx.sql.public.product
    .select(
      "id",
      "organizationId",
      "name",
      "stockQuantity",
      "minimumStock"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, input.productId),
        fns.eq(fields.organizationId, organizationId),
        fns.eq(fields.isActive, true),
        fns.raw`${fields.deletedAt} IS NULL`.returns("pg/bool@1")
      )
    )
    .build();

  const products = await tx.query(productPlan);
  const product = products[0];

  if (!product) {
    throw new Error("Product not found.");
  }

  // Determine stock change

  let stockChange = input.quantity;

  if (
    input.type === "SALE" ||
    input.type === "DAMAGE"
  ) {
    stockChange = -input.quantity;
  }

  if (input.type === "ADJUSTMENT") {
    if (!input.adjustmentDirection) {
      throw new Error(
        "Adjustment direction is required."
      );
    }

    if (input.adjustmentDirection === "DECREASE") {
      stockChange = -input.quantity;
    }
  }

  // Calculate new stock

  const newStockQuantity =
    product.stockQuantity + stockChange;

  if (newStockQuantity < 0) {
    throw new Error("Insufficient stock.");
  }

  // Update product stock

  const updateProductPlan = tx.sql.public.product
    .update({
      stockQuantity: newStockQuantity,
    })
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, product.id),
        fns.eq(fields.organizationId, organizationId),
        fns.eq(fields.isActive, true),
        fns.raw`${fields.deletedAt} IS NULL`.returns("pg/bool@1")
      )
    )
    .returning(
      "id",
      "name",
      "stockQuantity",
      "minimumStock"
    )
    .build();

  const updatedProducts = await tx.query(
    updateProductPlan
  );

  const updatedProduct = updatedProducts[0];

  if (!updatedProduct) {
    throw new Error("Failed to update product stock.");
  }

  // Record inventory movement

  const movementPlan = tx.sql.public.inventoryMovement
    .insert([
      {
        productId: product.id,
        organizationId,
        createdBy: userId,
        quantity: stockChange,
        type: input.type,
        reason: input.reason ?? null,
      },
    ])
    .returning(
      "id",
      "productId",
      "organizationId",
      "createdBy",
      "quantity",
      "type",
      "reason",
      "createdAt"
    )
    .build();

  const movements = await tx.query(movementPlan);
  const movement = movements[0];

  if (!movement) {
    throw new Error(
      "Failed to create inventory movement."
    );
  }

  return {
    product: updatedProduct,
    movement,
  };
}

// --------------------------------------------------
// Change stock
// --------------------------------------------------

export async function changeStock(
  input: ChangeStockInput
) {
  const user = await requirePermission("inventory:manage");

  const auditActions = {
    PURCHASE: "STOCK_PURCHASED",
    SALE: "STOCK_SOLD",
    ADJUSTMENT: "STOCK_ADJUSTED",
    RETURN: "STOCK_RETURNED",
    DAMAGE: "STOCK_DAMAGED",
  } as const;

  return db.transaction(async (tx) => {
    const result = await applyStockMovement(
      tx,
      input,
      user.organizationId,
      user.userId
    );

    await createAuditLog(
      {
        organizationId: user.organizationId,
        userId: user.userId,
        action: auditActions[input.type],
        source: "BUSINESS_API",
        status: "SUCCESS",
        toolName: null,
      },
      tx
    );

    return result;
  });
}

// --------------------------------------------------
// Get inventory movement history
// --------------------------------------------------

export async function getInventoryMovements() {
  const user = await requirePermission("inventory:read");
  const runtime = await getDbRuntime();

  const plan = db.sql.public.inventoryMovement
    .select(
      "id",
      "productId",
      "organizationId",
      "createdBy",
      "quantity",
      "type",
      "reason",
      "createdAt"
    )
    .where((fields, fns) =>
      fns.eq(fields.organizationId, user.organizationId)
    )
    .build();

  return runtime.query(plan);
}

// --------------------------------------------------
// Get low-stock products
// --------------------------------------------------

export async function getLowStockProducts() {
  const user = await requirePermission("inventory:read");
  const runtime = await getDbRuntime();

  const plan = db.sql.public.product
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
        fns.eq(
          fields.organizationId,
          user.organizationId
        ),
        fns.eq(fields.isActive, true),
        fns.raw`${fields.deletedAt} IS NULL`.returns("pg/bool@1"),
        fns.raw`${fields.stockQuantity} <= ${fields.minimumStock}`.returns("pg/bool@1")
      )
    )
    .build();

  return runtime.query(plan);
}

// --------------------------------------------------
// Get stock history for one product
// --------------------------------------------------

export async function getProductStockHistory(
  productId: number
) {
  const user = await requirePermission("inventory:read");
  const runtime = await getDbRuntime();

  // Verify product belongs to current organization

  const productPlan = db.sql.public.product
    .select("id")
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, productId),
        fns.eq(
          fields.organizationId,
          user.organizationId
        ),
        fns.eq(fields.isActive, true),
        fns.raw`${fields.deletedAt} IS NULL`.returns("pg/bool@1")
      )
    )
    .build();

  const products = await runtime.query(productPlan);

  if (!products[0]) {
    throw new Error("Product not found.");
  }

  // Retrieve movement history

  const movementPlan = db.sql.public.inventoryMovement
    .select(
      "id",
      "productId",
      "organizationId",
      "createdBy",
      "quantity",
      "type",
      "reason",
      "createdAt"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.productId, productId),
        fns.eq(
          fields.organizationId,
          user.organizationId
        )
      )
    )
    .build();

  return runtime.query(movementPlan);
}
