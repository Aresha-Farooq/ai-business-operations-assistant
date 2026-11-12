import { db, createAuditLog } from "@business-platform/database";
import { requirePermission } from "@business-platform/auth/authorization";
import {
  ORDER_CONFLICT_MESSAGE,
  OrderLifecycleError,
  getShippingTransitionError,
  type OrderStatus,
  type ShippingStatus,
} from "./order-status";

type UpdateShippingStatusInput = {
  orderId: number;
  shippingStatus: ShippingStatus;
};

// --------------------------------------------------
// Change the shipping status of an order of the CURRENT organization.
//
// This only records delivery progress. It never changes the payment:
// a COD payment is NOT marked as paid because an order was delivered.
// --------------------------------------------------
export async function updateShippingStatus(
  input: UpdateShippingStatusInput
) {
  const user = await requirePermission("orders:manage");

  return db.transaction(async (tx) => {
    const orderPlan = tx.sql.public.order
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

    const orders = await tx.query(orderPlan);
    const order = orders[0];

    if (!order) {
      throw new OrderLifecycleError("NOT_FOUND", "Order not found.");
    }

    const currentStatus = order.status as OrderStatus;
    const currentShipping = order.shippingStatus as ShippingStatus;

    const transitionError = getShippingTransitionError(
      { status: currentStatus, shippingStatus: currentShipping },
      input.shippingStatus
    );

    if (transitionError) {
      throw new OrderLifecycleError(
        "INVALID_TRANSITION",
        transitionError
      );
    }

    // Compare-and-set on BOTH fields: the order must not have been
    // cancelled or shipped by someone else in the meantime.
    const updatePlan = tx.sql.public.order
      .update({ shippingStatus: input.shippingStatus })
      .where((fields, fns) =>
        fns.and(
          fns.eq(fields.id, order.id),
          fns.eq(fields.organizationId, user.organizationId),
          fns.eq(fields.status, currentStatus),
          fns.eq(fields.shippingStatus, currentShipping)
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

    const updatedOrders = await tx.query(updatePlan);
    const updatedOrder = updatedOrders[0];

    if (!updatedOrder) {
      throw new OrderLifecycleError("CONFLICT", ORDER_CONFLICT_MESSAGE);
    }

    await createAuditLog(
      {
        organizationId: user.organizationId,
        userId: user.userId,
        action: `ORDER_SHIPPING_CHANGED #${order.id} ${currentShipping}->${input.shippingStatus}`,
        source: "BUSINESS_API",
        status: "SUCCESS",
        toolName: null,
      },
      tx
    );

    return updatedOrder;
  });
}
