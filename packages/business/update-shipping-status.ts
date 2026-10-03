import { db, getDbRuntime } from "@business-platform/database";
import { requireCurrentUser } from "@business-platform/auth/session";
import {
  canTransitionShippingStatus,
  type ShippingStatus,
} from "./order-status";

type UpdateShippingStatusInput = {
  orderId: number;
  shippingStatus: ShippingStatus;
};

export async function updateShippingStatus(
  input: UpdateShippingStatusInput
) {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  const orderPlan = db.sql.public.order
    .select(
      "id",
      "organizationId",
      "status",
      "shippingStatus",
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

  const currentShippingStatus =
    order.shippingStatus as ShippingStatus;

  if (
    !canTransitionShippingStatus(
      currentShippingStatus,
      input.shippingStatus
    )
  ) {
    throw new Error(
      `Cannot change shipping status from ${currentShippingStatus} to ${input.shippingStatus}.`
    );
  }

  const updatePlan = db.sql.public.order
    .update({
      shippingStatus: input.shippingStatus,
    })
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, input.orderId),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .returning(
      "id",
      "organizationId",
      "status",
      "shippingStatus",
      "totalAmount"
    )
    .build();

  const updatedOrders = await runtime.query(updatePlan);
  const updatedOrder = updatedOrders[0];

  if (!updatedOrder) {
    throw new Error("Failed to update shipping status.");
  }

  return updatedOrder;
}