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

const MAX_RESTOCK_ATTEMPTS = 5;

// --------------------------------------------------
// Return the stock of every item of a cancelled order.
//
// Deliberately does NOT use applyStockMovement(): that function refuses
// inactive / soft-deleted products, but a cancelled order must always get
// its stock back. Uses a compare-and-set on stockQuantity so a concurrent
// stock change can never be overwritten.
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

  // One restock per product, even if the order somehow lists it twice.
  const quantityByProduct = new Map<number, number>();

  for (const item of items) {
    quantityByProduct.set(
      item.productId,
      (quantityByProduct.get(item.productId) ?? 0) + item.quantity
    );
  }

  for (const [productId, quantity] of quantityByProduct) {
    let restocked = false;

    for (let attempt = 0; attempt < MAX_RESTOCK_ATTEMPTS; attempt++) {
      const productPlan = tx.sql.public.product
        .select("id", "stockQuantity")
        .where((fields, fns) =>
          fns.and(
            fns.eq(fields.id, productId),
            fns.eq(fields.organizationId, organizationId)
          )
        )
        .build();

      const products = await tx.query(productPlan);
      const product = products[0];

      if (!product) {
        throw new Error(
          `Cannot restock: product ${productId} was not found in this organization.`
        );
      }

      const updatePlan = tx.sql.public.product
        .update({ stockQuantity: product.stockQuantity + quantity })
        .where((fields, fns) =>
          fns.and(
            fns.eq(fields.id, productId),
            fns.eq(fields.organizationId, organizationId),
            fns.eq(fields.stockQuantity, product.stockQuantity)
          )
        )
        .returning("id")
        .build();

      const updated = await tx.query(updatePlan);

      if (updated[0]) {
        restocked = true;
        break;
      }
    }

    if (!restocked) {
      throw new OrderLifecycleError("CONFLICT", ORDER_CONFLICT_MESSAGE);
    }

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
    // 1. Load the order, scoped to the user's organization
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

    // 2. Does the order have a payment that was already collected?
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

    // 3. Validate the transition on the server
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

    // 4. Compare-and-set: only update if nobody changed the order since
    //    we read it. Two simultaneous cancels can never both succeed, so
    //    stock is restored at most once.
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

    // 5. Side effects of cancellation, in the same transaction
    if (input.status === "CANCELLED") {
      await restockOrderItems(
        tx,
        order.id,
        user.organizationId,
        user.userId
      );

      // Nothing will be collected for a cancelled order. There is no
      // CANCELLED payment status, so FAILED is used (PAID is blocked above).
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

    // 6. Audit trail
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
