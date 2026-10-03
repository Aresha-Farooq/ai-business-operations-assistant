import { z } from "zod";

export const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().min(2, "Name is required."),
    email: z.string().email("Invalid email address."),
    phone: z.string().min(7, "Phone number is required."),
    address: z.string().min(5, "Address is required."),
  }),

  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "Cart cannot be empty."),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;