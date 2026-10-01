import { z } from "zod";

export const createPaymentSchema = z.object({
  orderId: z.number().int().positive("Order ID must be positive."),


 

  method: z.enum([
    "COD",
    "CARD",
    "JAZZCASH",
    "EASYPAISA",
  ]),
});
export const verifyPaymentSchema = z.object({
  transactionId: z
    .string()
    .min(1, "Transaction ID is required."),
});
export const refundPaymentSchema = z.object({
  paymentId: z.number().int().positive("Payment ID must be positive."),
});