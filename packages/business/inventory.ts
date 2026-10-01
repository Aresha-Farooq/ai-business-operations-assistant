import { db } from "@business-platform/database";
import { requireCurrentUser } from "@business-platform/auth/session";

type ChangeStockInput = {
  productId: number;
  quantity: number;
  type: "PURCHASE" | "SALE" | "ADJUSTMENT" | "RETURN" | "DAMAGE";
  adjustmentDirection?: "INCREASE" | "DECREASE";
  reason?: string;
};

type InventoryTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export async function applyStockMovement(
  tx: InventoryTransaction,
  input: ChangeStockInput,
  organizationId: number
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
        fns.eq(fields.organizationId, organizationId)
      )
    )
    .build();

  const products = await tx.query(productPlan);

  const product = products[0];

  if (!product) {
    throw new Error("Product not found.");
  }

  /*
   * Determine whether stock should increase or decrease.
   *
   * PURCHASE  → increase
   * RETURN    → increase
   * SALE      → decrease
   * DAMAGE    → decrease
   * ADJUSTMENT → depends on adjustmentDirection
   */

  const stockDecreaseTypes = ["SALE", "DAMAGE"];

  let stockChange = input.quantity;

  if (stockDecreaseTypes.includes(input.type)) {
    stockChange = -input.quantity;
  }

  if (input.type === "ADJUSTMENT") {
    if (!input.adjustmentDirection) {
      throw new Error(
        "Adjustment direction is required for stock adjustment."
      );
    }

    if (input.adjustmentDirection === "DECREASE") {
      stockChange = -input.quantity;
    }

    if (input.adjustmentDirection === "INCREASE") {
      stockChange = input.quantity;
    }
  }

  const newStockQuantity = product.stockQuantity + stockChange;

  if (newStockQuantity < 0) {
    throw new Error("Insufficient stock.");
  }

  const updateProductPlan = tx.sql.public.product
    .update({
      stockQuantity: newStockQuantity,
    })
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, product.id),
        fns.eq(fields.organizationId, organizationId)
      )
    )
    .returning(
      "id",
      "name",
      "stockQuantity",
      "minimumStock"
    )
    .build();

  const updatedProducts = await tx.query(updateProductPlan);

  const updatedProduct = updatedProducts[0];

  if (!updatedProduct) {
    throw new Error("Failed to update product stock.");
  }

  const movementPlan = tx.sql.public.inventoryMovement
    .insert([
      {
        productId: product.id,
        organizationId,
        quantity: input.quantity,
        type: input.type,
        reason: input.reason ?? null,
      },
    ])
    .returning(
      "id",
      "productId",
      "organizationId",
      "quantity",
      "type",
      "reason"
    )
    .build();

  const movements = await tx.query(movementPlan);

  const movement = movements[0];

  if (!movement) {
    throw new Error("Failed to create inventory movement.");
  }

  return {
    product: updatedProduct,
    movement,
  };
}

export async function changeStock(input: ChangeStockInput) {
  const user = await requireCurrentUser();

  const result = await db.transaction(async (tx) => {
    const movement = await applyStockMovement(
      tx,
      input,
      user.organizationId
    );

    return movement;
  });

  return result;
}