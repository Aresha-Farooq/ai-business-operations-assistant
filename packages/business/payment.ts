import { db, getDbRuntime } from "@business-platform/database";
import { requireCurrentUser } from "@business-platform/auth/session";
import type {
  PaymentGateway,
  CreateGatewayPaymentInput,
} from "./payment/gateway.js";

type CreatePaymentInput = {
  orderId: number;
  method: "COD" | "CARD" | "JAZZCASH" | "EASYPAISA";
};

export async function createPayment(
  input: CreatePaymentInput,
  paymentGateway: PaymentGateway
) {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  // 1. Find the order belonging to the current organization
  const orderPlan = db.sql.public.order
    .select(
      "id",
      "customerId",
      "organizationId",
      "status",
      "totalAmount"
    )
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
    throw new Error("Order not found.");
  }

  // 2. Prevent payments for invalid order states
  if (order.status === "CANCELLED") {
    throw new Error(
      "Cannot create a payment for a cancelled order."
    );
  }

  if (order.status === "COMPLETED") {
    throw new Error(
      "Cannot create a payment for a completed order."
    );
  }

  // 3. Get the trusted payment amount from the database
  const paymentAmount = order.totalAmount;

  if (paymentAmount <= 0) {
    throw new Error("Order total must be greater than zero.");
  }

  // 4. Check whether the order already has an active payment
  const existingPaymentPlan = db.sql.public.payment
    .select(
      "id",
      "status",
      "amount",
      "method"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.orderId, order.id),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .build();

  const existingPayments =
    await runtime.query(existingPaymentPlan);

  const activePayment = existingPayments.find(
    (payment) =>
      payment.status === "PENDING" ||
      payment.status === "PAID"
  );

  if (activePayment) {
    throw new Error(
      "This order already has an active payment."
    );
  }

  // 5. Create our internal Payment record
  const paymentPlan = db.sql.public.payment
    .insert([
      {
        orderId: order.id,
        organizationId: user.organizationId,
        amount: paymentAmount,
        currency: "PKR",
        method: input.method,
        status: "PENDING",
        gateway: null,
        gatewayTransactionId: null,
      },
    ])
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

  const payments = await runtime.query(paymentPlan);
  const payment = payments[0];

  if (!payment) {
    throw new Error("Failed to create payment.");
  }
  
if (input.method === "COD") {
  return {
    payment,
    gateway: null,
  };
}
  // 6. Prepare the information required by the gateway
  const gatewayInput: CreateGatewayPaymentInput = {
    paymentId: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    orderId: payment.orderId,
  };

  // 7. Ask the gateway to create the external payment
  const gatewayResult =
    await paymentGateway.createPayment(gatewayInput);

  // 8. Save the gateway transaction information
  const updatePaymentPlan = db.sql.public.payment
    .update({
      gatewayTransactionId:
        gatewayResult.transactionId ?? null,
      gateway: "MOCK",
    })
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, payment.id),
        fns.eq(
          fields.organizationId,
          user.organizationId
        )
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

  const updatedPayments =
    await runtime.query(updatePaymentPlan);

  const updatedPayment = updatedPayments[0];

  if (!updatedPayment) {
    throw new Error(
      "Failed to update payment with gateway information."
    );
  }

  // 9. Return both our payment and the gateway information
  return {
    payment: updatedPayment,
    gateway: gatewayResult,
  };
}