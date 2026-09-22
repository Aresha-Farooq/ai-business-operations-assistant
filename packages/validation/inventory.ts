import { z } from "zod";

export const changeStockSchema = z.object({
  productId: z.number().int().positive(),

  quantity: z.number().int().positive(
  "Quantity must be greater than zero."
),

  type: z.enum([
    "PURCHASE",
    "SALE",
    "ADJUSTMENT",
    "RETURN",
    "DAMAGE",
  ]),

  reason: z.string().max(500).optional(),
});

export type ChangeStockInput = z.infer<typeof changeStockSchema>;