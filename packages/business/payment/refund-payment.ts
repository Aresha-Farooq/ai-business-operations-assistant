import { db, getDbRuntime } from "@business-platform/database";
import { requireCurrentUser } from "@business-platform/auth/session";
import type { PaymentGateway } from "./gateway.js";

export async function refundPayment(
  paymentId: number,
  paymentGateway: PaymentGateway
) {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  const paymentPlan = db.sql.public.payment
    .select(
      "id",
      "orderId",
      "organizationId",
      "amount",
      "currency",
      "method",
      "status",
      "gateway",
      "gatewayTransactionId",
      "createdAt",
      "updatedAt"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, paymentId),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .build();

  const payments = await runtime.query(paymentPlan);
  const payment = payments[0];

  if (!payment) {
    throw new Error("Payment not found.");
  }

  if (payment.status !== "PAID") {
    throw new Error("Only paid payments can be refunded.");
  }

  if (!payment.gatewayTransactionId) {
    throw new Error("Payment has no gateway transaction ID.");
  }

  const gatewayResult = await paymentGateway.refundPayment(
    payment.gatewayTransactionId,
    payment.amount
  );

  const updatePaymentPlan = db.sql.public.payment
    .update({
      status: gatewayResult.status,
    })
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, payment.id),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .returning(
      "id",
      "orderId",
      "organizationId",
      "amount",
      "currency",
      "method",
      "status",
      "gateway",
      "gatewayTransactionId",
      "createdAt",
      "updatedAt"
    )
    .build();

  const updatedPayments = await runtime.query(updatePaymentPlan);
  const updatedPayment = updatedPayments[0];

  if (!updatedPayment) {
    throw new Error("Failed to update payment after refund.");
  }

  return {
    payment: updatedPayment,
    gateway: gatewayResult,
  };
}