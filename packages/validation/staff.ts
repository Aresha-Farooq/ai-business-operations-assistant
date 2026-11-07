import { z } from "zod";

// Validate new staff accounts
export const createStaffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters."),

  email: z
    .string()
    .trim()
    .email("Invalid email address."),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters."),

  role: z.enum(["MANAGER", "STAFF"]),
});

// Validate staff updates
export const updateStaffSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .optional(),

    email: z
      .string()
      .trim()
      .email("Invalid email address.")
      .optional(),

    role: z.enum(["MANAGER", "STAFF"]).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "Provide at least one field to update.",
    }
  );

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;