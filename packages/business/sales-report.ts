import { db, getDbRuntime } from "@business-platform/database";
import { requireCurrentUser } from "@business-platform/auth/session";

export async function getSalesReport() {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  const ordersPlan = db.sql.public.order
    .select(
      "id",
      "status",
      "totalAmount",
      "createdAt",
      "organizationId"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.organizationId, user.organizationId),
        fns.or(
          fns.eq(fields.status, "CONFIRMED"),
          fns.eq(fields.status, "PROCESSING"),
          fns.eq(fields.status, "COMPLETED")
        )
      )
    )
    .build();

  const orders = await runtime.query(ordersPlan);

  const totalSales = orders.reduce(
    (total, order) => total + order.totalAmount,
    0
  );

  return {
    organizationId: user.organizationId,
    totalOrders: orders.length,
    totalSales,
    orders,
  };
}
