
import { db, getDbRuntime, createAuditLog } from "@business-platform/database";
import { requirePermission } from "@business-platform/auth/authorization";
import { MockPaymentGateway } from "./payment/mock-gateway.js";
import type {
  PaymentGateway,
  CreateGatewayPaymentInput,
} from "./payment/gateway.js";
import {
  PaymentError,
  getCreatePaymentDecision,
} from "./payment/payment-rules.js";

type CreatePaymentInput = {
  orderId: number;
  method: "COD" | "CARD" | "JAZZCASH" | "EASYPAISA";
};

const orderLocks = new Map<number, Promise<void>>();

async function withOrderLock<T>(
  orderId: number,
  task: () => Promise<T>
): Promise<T> {
  const previous = orderLocks.get(orderId) ?? Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  orderLocks.set(orderId, current);
  await previous;

  try {
    return await task();
  } finally {
    release();
    if (orderLocks.get(orderId) === current) {
      orderLocks.delete(orderId);
    }
  }
}

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

export async function createPayment(
  input: CreatePaymentInput,
  paymentGateway: PaymentGateway = new MockPaymentGateway()
) {
  const user = await requirePermission("payments:manage");

  return withOrderLock(input.orderId, async () => {
    const runtime = await getDbRuntime();

    const orderPlan = db.sql.public.order
      .select("id", "status", "totalAmount")
      .where((fields, fns) =>
        fns.and(
          fns.eq(fields.id, input.orderId),
          fns.eq(fields.organizationId, user.organizationId)
        )
      )
      .build();

    const orders = await runtime.query(orderPlan);
    const order = orders[0];

    if (!order) {
      throw new PaymentError("NOT_FOUND", "Order not found.");
    }

    if (!Number.isFinite(order.totalAmount) || order.totalAmount <= 0) {
      throw new PaymentError(
        "INVALID_AMOUNT",
        "Order total must be greater than zero."
      );
    }

    const existingPlan = db.sql.public.payment
      .select("id", "status", "method")
      .where((fields, fns) =>
        fns.and(
          fns.eq(fields.orderId, order.id),
          fns.eq(fields.organizationId, user.organizationId)
        )
      )
      .build();

    const existingPayments = await runtime.query(existingPlan);

    const decision = getCreatePaymentDecision(
      order,
      existingPayments,
      input.method
    );

    if (decision.action === "reuse") {
      const existingPaymentPlan = db.sql.public.payment
        .select(...paymentFields)
        .where((fields, fns) =>
          fns.and(
            fns.eq(fields.id, decision.paymentId),
            fns.eq(fields.organizationId, user.organizationId)
          )
        )
        .build();

      const existingPayment = (
        await runtime.query(existingPaymentPlan)
      )[0];

      if (!existingPayment) {
        throw new PaymentError("NOT_FOUND", "Payment not found.");
      }

      return {
        payment: existingPayment,
        gateway: null,
        idempotentReplay: true,
      };
    }

    const paymentPlan = db.sql.public.payment
      .insert([
        {
          orderId: order.id,
          organizationId: user.organizationId,
          amount: order.totalAmount,
          currency: "PKR",
          method: input.method,
          status: "PENDING",
          gateway: input.method === "COD" ? null : "MOCK",
          gatewayTransactionId: null,
        },
      ])
      .returning(...paymentFields)
      .build();

    const payment = (await runtime.query(paymentPlan))[0];

    if (!payment) {
      throw new Error("Failed to create payment.");
    }

    await createAuditLog({
      organizationId: user.organizationId,
      action: `PAYMENT_CREATED #${payment.id}`,
      source: "BUSINESS_API",
      status: "SUCCESS",
    });

    if (input.method === "COD") {
      return {
        payment,
        gateway: null,
        idempotentReplay: false,
      };
    }

    const gatewayInput: CreateGatewayPaymentInput = {
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      orderId: payment.orderId,
    };

    let gatewayResult;

    try {
      gatewayResult = await paymentGateway.createPayment(gatewayInput);
    } catch (error) {
      const failedPlan = db.sql.public.payment
        .update({ status: "FAILED" })
        .where((fields, fns) =>
          fns.and(
            fns.eq(fields.id, payment.id),
            fns.eq(fields.organizationId, user.organizationId),
            fns.eq(fields.status, "PENDING")
          )
        )
        .build();

      await runtime.query(failedPlan);

      try {
        await createAuditLog({
          organizationId: user.organizationId,
          action: `PAYMENT_CREATE_FAILED #${payment.id}`,
          source: "BUSINESS_API",
          status: "FAILURE",
          errorMessage: "Payment gateway creation failed.",
        });
      } catch {
        // Preserve the original gateway error.
      }

      throw new PaymentError(
        "GATEWAY_ERROR",
        error instanceof Error ? error.message : "Payment gateway failed."
      );
    }

    const updatePlan = db.sql.public.payment
      .update({
        gatewayTransactionId: gatewayResult.transactionId ?? null,
        gateway: "MOCK",
      })
      .where((fields, fns) =>
        fns.and(
          fns.eq(fields.id, payment.id),
          fns.eq(fields.organizationId, user.organizationId)
        )
      )
      .returning(...paymentFields)
      .build();

    const updatedPayment = (await runtime.query(updatePlan))[0];

    if (!updatedPayment) {
      throw new Error("Failed to save gateway payment information.");
    }

    return {
      payment: updatedPayment,
      gateway: gatewayResult,
      idempotentReplay: false,
    };
  });
}
