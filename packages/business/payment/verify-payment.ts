
import { db, createAuditLog } from "@business-platform/database";
import { requirePermission } from "@business-platform/auth/authorization";
import { MockPaymentGateway } from "./mock-gateway.js";
import type { PaymentGateway } from "./gateway.js";
import {
  PaymentError,
  getVerifyPrecondition,
  getVerificationOutcome,
} from "./payment-rules.js";

const paymentFields = [
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
  "updatedAt",
] as const;

export async function verifyPayment(
  transactionId: string,
  paymentGateway: PaymentGateway = new MockPaymentGateway()
) {
  const user = await requirePermission("payments:manage");
  let paymentId: number | undefined;

  try {
    const result = await db.transaction(async (tx) => {
      const paymentPlan = tx.sql.public.payment
        .select(...paymentFields)
        .where((fields, fns) =>
          fns.and(
            fns.eq(fields.gatewayTransactionId, transactionId),
            fns.eq(fields.organizationId, user.organizationId)
          )
        )
        .build();

      const payment = (await tx.query(paymentPlan))[0];

      if (!payment) {
        throw new PaymentError("NOT_FOUND", "Payment not found.");
      }

      paymentId = payment.id;

      const precondition = getVerifyPrecondition(payment);

      if (precondition === "replay") {
        return {
          payment,
          gateway: { status: "PAID" as const, transactionId },
          idempotentReplay: true,
          verifiedNow: false,
        };
      }

      let gatewayResult;

      try {
        gatewayResult =
          await paymentGateway.verifyPayment(transactionId);
      } catch (error) {
        throw new PaymentError(
          "GATEWAY_ERROR",
          error instanceof Error ? error.message : "Gateway verification failed."
        );
      }

      const nextStatus = getVerificationOutcome(
        payment,
        transactionId,
        gatewayResult
      );

      const updatePlan = tx.sql.public.payment
        .update({ status: nextStatus })
        .where((fields, fns) =>
          fns.and(
            fns.eq(fields.id, payment.id),
            fns.eq(fields.organizationId, user.organizationId),
            fns.eq(fields.status, "PENDING")
          )
        )
        .returning(...paymentFields)
        .build();

      const updatedPayment = (await tx.query(updatePlan))[0];

      if (!updatedPayment) {
        const currentPlan = tx.sql.public.payment
          .select(...paymentFields)
          .where((fields, fns) =>
            fns.and(
              fns.eq(fields.id, payment.id),
              fns.eq(fields.organizationId, user.organizationId)
            )
          )
          .build();

        const currentPayment = (await tx.query(currentPlan))[0];

        if (currentPayment?.status === "PAID") {
          return {
            payment: currentPayment,
            gateway: { status: "PAID" as const, transactionId },
            idempotentReplay: true,
            verifiedNow: false,
          };
        }

        throw new PaymentError(
          "CONFLICT",
          "Payment status changed during verification."
        );
      }

      return {
        payment: updatedPayment,
        gateway: gatewayResult,
        idempotentReplay: false,
        verifiedNow: nextStatus === "PAID",
      };
    });

    if (result.verifiedNow) {
      await createAuditLog({
        organizationId: user.organizationId,
       action: `PAYMENT_VERIFIED #${result.payment.id} `,
        source: "BUSINESS_API",
        status: "SUCCESS",
      });
    }

    return {
      payment: result.payment,
      gateway: result.gateway,
      idempotentReplay: result.idempotentReplay,
    };
  } catch (error) {
    if (
      error instanceof PaymentError &&
      error.code === "VERIFICATION_MISMATCH"
    ) {
      try {
        await createAuditLog({
          organizationId: user.organizationId,
          action: `PAYMENT_VERIFY_REJECTED #${paymentId ?? "UNKNOWN"}`,
          source: "BUSINESS_API",
          status: "FAILURE",
          errorMessage: error.message,
        });
      } catch {
        // Preserve the original error.
      }
    }

    throw error;
  }
}
