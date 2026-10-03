import { db, getDbRuntime } from "@business-platform/database";
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

// 5. Create order + items + inventory
const createdOrder = await db.transaction(async (tx) => {
  // ...
});
  // 3. Validate stock

  // 4. Calculate total

  // 5. Create order + items + inventory movement in transaction

  // 6. Return created order
}