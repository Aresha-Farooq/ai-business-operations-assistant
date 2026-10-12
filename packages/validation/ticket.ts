import { z } from "zod";

export const createTicketSchema = z.object({
  customerId: z.number().int().positive(),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters."),
  description: z.string().trim().min(10, "Description must be at least 10 characters."),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export const assignTicketSchema = z.object({
  assigneeId: z.number().int().positive(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
