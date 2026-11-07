
import { z } from "zod";

export const createProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Product name must be at least 2 characters."),

    description: z.string().optional(),

    sku: z
      .string()
      .trim()
      .min(1, "SKU is required."),

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

    category: z.string().trim().optional(),

    imageUrl: z.string().trim().url("Please enter a valid image URL.").optional().or(z.literal("")),

    isPublished: z.boolean().optional(),
  })
  .refine(
    (data) => data.salePrice >= data.purchasePrice,
    {
      message: "Sale price cannot be lower than purchase price.",
      path: ["salePrice"],
    }
  );

export const updateProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .optional(),

    description: z.string().optional(),

    sku: z
      .string()
      .trim()
      .min(1, "SKU is required.")
      .optional(),

    purchasePrice: z
      .number()
      .nonnegative("Purchase price cannot be negative.")
      .optional(),

    salePrice: z
      .number()
      .nonnegative("Sale price cannot be negative.")
      .optional(),

    minimumStock: z
      .number()
      .int("Minimum stock must be a whole number.")
      .nonnegative("Minimum stock cannot be negative.")
      .optional(),

    category: z.string().trim().optional(),

    imageUrl: z.string().trim().url("Please enter a valid image URL.").optional().or(z.literal("")),

    isPublished: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided for update.",
    }
  )
  .refine(
    (data) =>
      data.purchasePrice === undefined ||
      data.salePrice === undefined ||
      data.salePrice >= data.purchasePrice,
    {
      message: "Sale price cannot be lower than purchase price.",
      path: ["salePrice"],
    }
  );

export type CreateProductInput = z.infer<typeof createProductSchema>;

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
