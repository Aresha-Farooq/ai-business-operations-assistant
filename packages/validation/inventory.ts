
import { z } from "zod";

export const inventoryMovementSchema = z
  .object({
    productId: z.number().int().positive(),

    quantity: z
      .number()
      .int()
      .positive("Quantity must be greater than zero."),

    type: z.enum([
      "PURCHASE",
      "SALE",
      "ADJUSTMENT",
      "RETURN",
      "DAMAGE",
    ]),

    adjustmentDirection: z
      .enum(["INCREASE", "DECREASE"])
      .optional(),

    reason: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.type === "ADJUSTMENT"
        ? data.adjustmentDirection !== undefined
        : data.adjustmentDirection === undefined,
    {
      message:
        "Adjustment direction is required only for adjustments.",
      path: ["adjustmentDirection"],
    }
  );

export const changeStockSchema = inventoryMovementSchema;

export type InventoryMovementInput = z.infer<
  typeof inventoryMovementSchema
>;
