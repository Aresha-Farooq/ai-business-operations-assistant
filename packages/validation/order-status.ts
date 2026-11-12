import { z } from "zod";

// Target statuses that may be requested through the API.
// PENDING is intentionally absent: an order only starts as PENDING,
// it can never be moved back to it.
export const orderStatusSchema = z.enum([
  "CONFIRMED",
  "PROCESSING",
  "CANCELLED",
  "COMPLETED",
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

// NOT_SHIPPED is the starting state and can never be requested.
export const shippingStatusSchema = z.enum([
  "SHIPPED",
  "DELIVERED",
]);

export type ShippingStatus = z.infer<typeof shippingStatusSchema>;
