import { db, getDbRuntime } from "@business-platform/database";
import { getCurrentUser } from "@business-platform/auth/session";
import { applyStockMovement } from "@business-platform/business/inventory";
type UpdateOrderStatusInput = {
  orderId: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
};

export async function updateOrderStatus(input: UpdateOrderStatusInput) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const runtime = await getDbRuntime();

  const orderPlan = db.sql.public.order
    .select("id", "organizationId", "status")
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, input.orderId),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .build();

  const orders = await runtime.query(orderPlan);

  const existingOrder = orders[0];

  if (!existingOrder) {
    throw new Error("Order not found.");
  }

  const allowedTransitions: Record<
    typeof existingOrder.status,
    string[]
  > = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["COMPLETED", "CANCELLED"],
    CANCELLED: [],
    COMPLETED: [],
  };

  if (!allowedTransitions[existingOrder.status].includes(input.status)) {
    throw new Error(
      `Cannot change order status from ${existingOrder.status} to ${input.status}.`
    );
  }

  const result = await db.transaction(async (tx) => {
    // If the order is being cancelled,
    // get its items so we can restore the stock.
    if (input.status === "CANCELLED") {
      const orderItemsPlan = tx.sql.public.orderItem
        .select(
          "id",
          "orderId",
          "productId",
          "quantity"
        )
        .where((fields, fns) =>
          fns.eq(fields.orderId, input.orderId)
        )
        .build();

      const orderItems = await tx.query(orderItemsPlan);

      if (orderItems.length === 0) {
        throw new Error("Order has no items.");
      }

      // Stock restoration will be added in the next step.
      for (const item of orderItems) {
  await applyStockMovement(
    tx,
    {
      productId: item.productId,
      quantity: item.quantity,
      type: "RETURN",
      reason: `Order #${input.orderId} cancelled`,
    },
    user.organizationId
  );
}
    }

    const updatePlan = tx.sql.public.order
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
        "customerId",
        "organizationId",
        "status",
        "totalAmount",
        "createdAt",
        "updatedAt"
      )
      .build();

    const updatedOrders = await tx.query(updatePlan);

    const updatedOrder = updatedOrders[0];

    if (!updatedOrder) {
      throw new Error("Failed to update order.");
    }

    return updatedOrder;
  });

  return result;
}