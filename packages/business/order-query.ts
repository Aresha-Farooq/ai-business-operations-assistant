import { db, getDbRuntime } from "@business-platform/database";
import { getCurrentUser } from "@business-platform/auth/session";

export async function getOrders() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const runtime = await getDbRuntime();

  const ordersPlan = db.sql.public.order
    .select(
      "id",
      "customerId",
      "organizationId",
      "status",
      "totalAmount",
      "createdAt",
      "updatedAt"
    )
    .where((fields, fns) =>
      fns.eq(fields.organizationId, user.organizationId)
    )
    .build();

  const orders = await runtime.query(ordersPlan);

  if (orders.length === 0) {
    return [];
  }

  const customerIds = [...new Set(orders.map((order) => order.customerId))];

  const customersPlan = db.sql.public.customer
    .select("id", "name", "email", "phone")
    .where((fields, fns) => fns.in(fields.id, customerIds))
    .build();

  const customers = await runtime.query(customersPlan);
const orderIds = orders.map((order) => order.id);

const orderItemsPlan = db.sql.public.orderItem
  .select(
    "id",
    "orderId",
    "productId",
    "quantity",
    "unitPrice"
  )
  .where((fields, fns) => fns.in(fields.orderId, orderIds))
  .build();

const orderItems = await runtime.query(orderItemsPlan);
const productIds = [...new Set(
  orderItems.map((item) => item.productId)
)];

const productsPlan = db.sql.public.product
  .select(
    "id",
    "name",
    "sku"
  )
  .where((fields, fns) => fns.in(fields.id, productIds))
  .build();

const products = await runtime.query(productsPlan);
 return orders.map((order) => {
  const customer =
    customers.find((customer) => customer.id === order.customerId) ?? null;

  const items = orderItems
    .filter((item) => item.orderId === order.id)
    .map((item) => ({
      ...item,
      product:
        products.find((product) => product.id === item.productId) ?? null,
    }));

  return {
    ...order,
    customer,
    items,
  };
});
}
export async function getOrderById(orderId: number) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const runtime = await getDbRuntime();

  const orderPlan = db.sql.public.order
    .select(
      "id",
      "customerId",
      "organizationId",
      "status",
      "totalAmount",
      "createdAt",
      "updatedAt"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, orderId),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .build();

  const orders = await runtime.query(orderPlan);

  const order = orders[0];

  if (!order) {
    throw new Error("Order not found.");
  }

  const customerPlan = db.sql.public.customer
    .select("id", "name", "email", "phone")
    .where((fields, fns) => fns.eq(fields.id, order.customerId))
    .build();

  const customers = await runtime.query(customerPlan);

  const customer = customers[0] ?? null;

  const orderItemsPlan = db.sql.public.orderItem
    .select(
      "id",
      "orderId",
      "productId",
      "quantity",
      "unitPrice"
    )
    .where((fields, fns) => fns.eq(fields.orderId, order.id))
    .build();

  const orderItems = await runtime.query(orderItemsPlan);

  const productIds = [
    ...new Set(orderItems.map((item) => item.productId)),
  ];

  const products =
    productIds.length > 0
      ? await runtime.query(
          db.sql.public.product
            .select("id", "name", "sku")
            .where((fields, fns) => fns.in(fields.id, productIds))
            .build()
        )
      : [];

  const items = orderItems.map((item) => ({
    ...item,
    product:
      products.find((product) => product.id === item.productId) ?? null,
  }));

  return {
    ...order,
    customer,
    items,
  };
}