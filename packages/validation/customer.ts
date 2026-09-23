import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phone: z.string().optional(),
});
export const updateCustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").optional(),
  email: z.string().email("Invalid email address.").optional(),
  phone: z.string().optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;