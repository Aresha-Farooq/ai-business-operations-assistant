import { db, getDbRuntime } from "@business-platform/database";
import { requirePermission } from "@business-platform/auth/authorization";
import {
  canTransitionOrderStatus,
  type OrderStatus,
} from "./order-status";

type UpdateOrderStatusInput = {
  orderId: number;
  status: OrderStatus;
};

export async function updateOrderStatus(
  input: UpdateOrderStatusInput
) {
  const user = await requirePermission("orders:manage");
  const runtime = await getDbRuntime();

  // Find the order inside the user's organization
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

  const currentStatus = order.status as OrderStatus;

  // Prevent invalid status transitions
  if (!canTransitionOrderStatus(currentStatus, input.status)) {
    throw new Error(
      `Cannot change order status from ${currentStatus} to ${input.status}.`
    );
  }

  // Update the order
  const updatePlan = db.sql.public.order
    .update({
      status: input.status,
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
    throw new Error("Failed to update order status.");
  }

  return updatedOrder;
}