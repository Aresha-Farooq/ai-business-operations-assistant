
import { z } from "zod";

export const guestCheckoutSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters."),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email address."),

  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid phone number."),

  address: z
    .string()
    .trim()
    .min(5, "Please enter your delivery address."),

  city: z
    .string()
    .trim()
    .min(2, "Please enter your city."),

  deliveryInstructions: z
    .string()
    .trim()
    .optional(),

  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Your cart cannot be empty.")
    .refine(
      (items) =>
        new Set(items.map((item) => item.productId)).size ===
        items.length,
      "A product cannot appear more than once in an order."
    ),

  paymentMethod: z.literal("COD"),
});

export type GuestCheckoutInput = z.infer<
  typeof guestCheckoutSchema
>;
