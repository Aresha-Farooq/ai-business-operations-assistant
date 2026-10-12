import { db, getDbRuntime } from "@business-platform/database";
import { applyStockMovement } from "@business-platform/business/inventory";
import type { CheckoutInput } from "@business-platform/validation/checkout";

export async function createCheckoutOrder(
  organizationId: number,
  input: CheckoutInput
) {
  const runtime = await getDbRuntime();

  // 1. Find or create customer
const customerPlan = db.sql.public.customer
  .select("id", "name", "email", "phone", "address", "organizationId")
  .where((fields, fns) =>
    fns.and(
      fns.eq(fields.email, input.customer.email),
      fns.eq(fields.organizationId, organizationId),
      fns.eq(fields.isActive, true)
    )
  )
  .build();

const customers = await runtime.query(customerPlan);

let customer = customers[0];

if (!customer) {
  const customerInsertPlan = db.sql.public.customer
    .insert([
      {
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        address: input.customer.address,
        organizationId,
        isActive: true,
      },
    ])
    .returning(
      "id",
      "name",
      "email",
      "phone",
      "address",
      "organizationId"
    )
    .build();

  const createdCustomers = await runtime.query(customerInsertPlan);

  customer = createdCustomers[0];

  if (!customer) {
    throw new Error("Failed to create customer.");
  }
}
  // 2. Find products for this organization
const productIds = input.items.map((item) => item.productId);

const productPlan = db.sql.public.product
  .select(
    "id",
    "name",
    "salePrice",
    "stockQuantity",
    "organizationId",
    "isActive"
  )
  .where((fields, fns) =>
    fns.and(
      fns.in(fields.id, productIds),
      fns.eq(fields.organizationId, organizationId),
      fns.eq(fields.isActive, true)
    )
  )
  .build();

const products = await runtime.query(productPlan);

if (products.length !== productIds.length) {
  throw new Error("One or more products were not found.");
}
// 1. Find/create customer
// ...

// 2. Find products
// ...

// 3. Build order items
const orderItems = input.items.map((item) => {
  const product = products.find(
    (product) => product.id === item.productId
  );

  if (!product) {
    throw new Error("Product not found.");
  }

  if (item.quantity > product.stockQuantity) {
    throw new Error(
      `Insufficient stock for product "${product.name}". Available: ${product.stockQuantity}, requested: ${item.quantity}.`
    );
  }

  return {
    productId: product.id,
    quantity: item.quantity,
    unitPrice: product.salePrice,
  };
});

// 4. Calculate total ← ADD IT HERE
const totalAmount = orderItems.reduce(
  (total, item) => total + item.quantity * item.unitPrice,
  0
);


  // 3. Validate stock

  // 4. Calculate total

  // 5. Create order + items + inventory movement in transaction
const createdOrder = await db.transaction(async (tx) => {
  for (const item of orderItems) {
    await applyStockMovement(
      tx,
      {
        productId: item.productId,
        quantity: item.quantity,
        type: "SALE",
        reason: "Customer checkout",
      },
      organizationId
    );
  }

  const orderPlan = tx.sql.public.order
    .insert([
      {
        customerId: customer.id,
        organizationId,
        status: "PENDING",
        shippingStatus: "NOT_SHIPPED",
        totalAmount,
      },
    ])
    .returning(
      "id",
      "customerId",
      "organizationId",
      "status",
      "shippingStatus",
      "totalAmount"
    )
    .build();

  const orders = await tx.query(orderPlan);

  const order = orders[0];

  if (!order) {
    throw new Error("Failed to create order.");
  }

  const orderItemPlan = tx.sql.public.orderItem
    .insert(
      orderItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))
    )
    .returning(
      "id",
      "orderId",
      "productId",
      "quantity",
      "unitPrice"
    )
    .build();

  const createdOrderItems = await tx.query(orderItemPlan);

  return {
    id: order.id,
    customerId: order.customerId,
    organizationId: order.organizationId,
    status: order.status,
    shippingStatus: order.shippingStatus,
    totalAmount: order.totalAmount,
    items: createdOrderItems,
  };
});

return createdOrder;
  // 6. Return created order
}