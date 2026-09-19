import { z } from "zod";

export const createProductSchema = z
  .object({
    name: z.string().min(2, "Product name must be at least 2 characters."),
    description: z.string().optional(),
    sku: z.string().min(1, "SKU is required."),

    purchasePrice: z
      .number()
      .nonnegative("Purchase price cannot be negative."),

    salePrice: z
      .number()
      .nonnegative("Sale price cannot be negative."),

    stockQuantity: z
      .number()
      .int("Stock quantity must be a whole number.")
      .nonnegative("Stock quantity cannot be negative.")
      .optional(),

    minimumStock: z
      .number()
      .int("Minimum stock must be a whole number.")
      .nonnegative("Minimum stock cannot be negative.")
      .optional(),
  })
  .refine(
    (data) => data.salePrice >= data.purchasePrice,
    {
      message: "Sale price cannot be lower than purchase price.",
      path: ["salePrice"],
    }
  );

export type CreateProductInput = z.infer<typeof createProductSchema>;