import { db, getDbRuntime } from "@business-platform/database";
import { applyStockMovement } from "@business-platform/business/inventory";
import { getCurrentUser } from "@business-platform/auth/session";

type CreateOrderItemInput = {
  productId: number;
  quantity: number;
};

type CreateOrderInput = {
  customerId: number;
  items: CreateOrderItemInput[];
};

export async function createOrder(input: CreateOrderInput) {
  // 1. Get authenticated user
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  // 2. Get database runtime
  const runtime = await getDbRuntime();

  // 3. Validate that the order contains at least one item
  if (input.items.length === 0) {
    throw new Error("Order must contain at least one item.");
  }

  // 4. Validate quantities
  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Quantity must be a positive whole number.");
    }
  }

  // 5. Prevent duplicate products in the same order
  const uniqueProductIds = new Set(
    input.items.map((item) => item.productId)
  );

  if (uniqueProductIds.size !== input.items.length) {
    throw new Error("A product cannot appear more than once in an order.");
  }

  // 6. Verify that the customer belongs to the user's organization
  const customerPlan = db.sql.public.customer
    .select("id", "name", "organizationId")
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, input.customerId),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .build();

  const customers = await runtime.query(customerPlan);

  if (customers.length === 0) {
    throw new Error("Customer not found.");
  }

  // 7. Get product IDs from the request
  const productIds = input.items.map((item) => item.productId);

  // 8. Fetch products belonging to the user's organization
  const productPlan = db.sql.public.product
   .select(
  "id",
  "name",
  "salePrice",
  "stockQuantity",
  "organizationId"
)
    .where((fields, fns) =>
      fns.and(
        fns.in(fields.id, productIds),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .build();

  const products = await runtime.query(productPlan);

  // 9. Make sure every requested product was found
  if (products.length !== productIds.length) {
    throw new Error("One or more products were not found.");
  }

  // 10. Create order-item data using the real database prices
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

  // 11. Calculate the order total on the server
  const totalAmount = orderItems.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0
  );

  // Order creation will be added in the next step.

  const createdOrder = await db.transaction(async (tx) => {

    for (const item of orderItems) {
  await applyStockMovement(
    tx,
    {
      productId: item.productId,
      quantity: item.quantity,
      type: "SALE",
      reason: "Order creation",
    },
    user.organizationId
  );
}


  const orderPlan = tx.sql.public.order
    .insert([
      {
        customerId: input.customerId,
        organizationId: user.organizationId,
        status: "PENDING",
        totalAmount,
      },
    ])
    .returning(
      "id",
      "customerId",
      "organizationId",
      "status",
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
    totalAmount: order.totalAmount,
    items: createdOrderItems,
  };
});
return createdOrder;
}
