import { z } from "zod";

export const createOrderSchema = z.object({
  customerId: z.number().int().positive(),

  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Order must contain at least one item."),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;