import { db, getDbRuntime } from "@business-platform/database";
import { getCurrentUser } from "@business-platform/auth/session";

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
      "customerId",
      "organizationId",
      "status",
      "totalAmount",
      "createdAt",
      "updatedAt"
    )
    .build();

  const updatedOrders = await runtime.query(updatePlan);

  const updatedOrder = updatedOrders[0];

  if (!updatedOrder) {
    throw new Error("Failed to update order.");
  }

  return updatedOrder;
}
