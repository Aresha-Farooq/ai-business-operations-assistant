
import { db, createAuditLog } from "@business-platform/database";
import { requirePermission } from "@business-platform/auth/authorization";
import {
  ORDER_CONFLICT_MESSAGE,
  OrderLifecycleError,
  getOrderTransitionError,
  type OrderStatus,
  type ShippingStatus,
} from "./order-status";

type UpdateOrderStatusInput = {
  orderId: number;
  status: OrderStatus;
};

type OrderTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

// --------------------------------------------------
// Restore stock for every item in a cancelled order.
// Uses atomic database arithmetic.
// --------------------------------------------------
async function restockOrderItems(
  tx: OrderTransaction,
  orderId: number,
  organizationId: number,
  userId: number
) {
  const itemsPlan = tx.sql.public.orderItem
    .select("productId", "quantity")
    .where((fields, fns) => fns.eq(fields.orderId, orderId))
    .build();

  const items = await tx.query(itemsPlan);

  // Combine quantities if an order contains the same product more than once.
  const quantityByProduct = new Map<number, number>();

  for (const item of items) {
    quantityByProduct.set(
      item.productId,
      (quantityByProduct.get(item.productId) ?? 0) + item.quantity
    );
  }

  type ProductUpdateCallback =
    Parameters<typeof tx.sql.public.product.update>[0];

  type ProductUpdateFields =
    Parameters<ProductUpdateCallback>[0];

  type ProductUpdateFunctions =
    Parameters<ProductUpdateCallback>[1];

  for (const [productId, quantity] of quantityByProduct) {
    // Increment stock directly in PostgreSQL.
    // No previously fetched stock value is used.
    const updatePlan = tx.sql.public.product
      .update((
        fields: ProductUpdateFields,
        fns: ProductUpdateFunctions
      ) => ({
        stockQuantity: fns.raw`
          ${fields.stockQuantity} + ${quantity}
        `.returns("pg/int4@1"),
      }))
      .where((fields, fns) =>
        fns.and(
          fns.eq(fields.id, productId),
          fns.eq(fields.organizationId, organizationId)
        )
      )
      .returning("id", "stockQuantity")
      .build();

    const updatedProducts = await tx.query(updatePlan);

    if (!updatedProducts[0]) {
      throw new Error(
        `Cannot restock: product ${productId} was not found in this organization.`
      );
    }

    // Record the restock in the same transaction.
    const movementPlan = tx.sql.public.inventoryMovement
      .insert([
        {
          productId,
          organizationId,
          createdBy: userId,
          quantity,
          type: "RETURN",
          reason: `Order #${orderId} cancelled`,
        },
      ])
      .returning("id")
      .build();

    const movements = await tx.query(movementPlan);

    if (!movements[0]) {
      throw new Error("Failed to record inventory movement.");
    }
  }
}

// --------------------------------------------------
// Change the status of an order of the CURRENT organization.
// --------------------------------------------------
export async function updateOrderStatus(
  input: UpdateOrderStatusInput
) {
  const user = await requirePermission("orders:manage");

  return db.transaction(async (tx) => {
    // 1. Load the order, scoped to the user's organization.
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

    // 2. Check whether the order has already been paid.
    const paymentsPlan = tx.sql.public.payment
      .select("id", "status")
      .where((fields, fns) =>
        fns.and(
          fns.eq(fields.orderId, order.id),
          fns.eq(fields.organizationId, user.organizationId)
        )
      )
      .build();

    const payments = await tx.query(paymentsPlan);

    const hasPaidPayment = payments.some(
      (payment) => payment.status === "PAID"
    );

    // 3. Validate the transition on the server.
    const transitionError = getOrderTransitionError(
      {
        status: currentStatus,
        shippingStatus: currentShipping,
        hasPaidPayment,
      },
      input.status
    );

    if (transitionError) {
      throw new OrderLifecycleError(
        "INVALID_TRANSITION",
        transitionError
      );
    }

    // 4. Compare-and-set: only one concurrent status transition succeeds.
    // This prevents two cancellation requests from restoring stock twice.
    const updatePlan = tx.sql.public.order
      .update({ status: input.status })
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

    // 5. Cancellation side effects stay inside the same transaction.
    if (input.status === "CANCELLED") {
      await restockOrderItems(
        tx,
        order.id,
        user.organizationId,
        user.userId
      );

      // Pending payments are marked FAILED.
      // Paid orders are blocked by the transition validation above.
      const voidPaymentsPlan = tx.sql.public.payment
        .update({ status: "FAILED" })
        .where((fields, fns) =>
          fns.and(
            fns.eq(fields.orderId, order.id),
            fns.eq(fields.organizationId, user.organizationId),
            fns.eq(fields.status, "PENDING")
          )
        )
        .returning("id")
        .build();

      await tx.query(voidPaymentsPlan);
    }

    // 6. Audit trail.
    await createAuditLog(
      {
        organizationId: user.organizationId,
        userId: user.userId,
        action: `ORDER_STATUS_CHANGED #${order.id} ${currentStatus}->${input.status}`,
        source: "BUSINESS_API",
        status: "SUCCESS",
        toolName: null,
      },
      tx
    );

    return updatedOrder;
  });
}
