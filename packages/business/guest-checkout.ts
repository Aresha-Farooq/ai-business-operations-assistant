
import { db } from "@business-platform/database";
import type { GuestCheckoutInput } from "@business-platform/validation/checkout";

export async function createGuestCheckoutOrder(
  slug: string,
  input: GuestCheckoutInput
) {
  // 1. Validate cart items
  if (input.items.length === 0) {
    throw new Error("Your cart cannot be empty.");
  }

  const productIds = input.items.map((item) => item.productId);

  if (new Set(productIds).size !== productIds.length) {
    throw new Error("Duplicate products are not allowed.");
  }

  return db.transaction(async (tx) => {
    // 2. Resolve organization from public storefront slug
    const organizationPlan = tx.sql.public.organization
      .select("id", "name", "slug")
      .where((fields, fns) =>
        fns.eq(fields.slug, slug)
      )
      .build();

    const organizations = await tx.query(organizationPlan);
    const organization = organizations[0];

    if (!organization) {
      throw new Error("Storefront not found.");
    }

    const organizationId = organization.id;

    // 3. Find existing customer within this organization
    const customerPlan = tx.sql.public.customer
      .select(
        "id",
        "name",
        "email",
        "phone",
        "organizationId"
      )
      .where((fields, fns) =>
        fns.and(
          fns.eq(fields.email, input.email),
          fns.eq(fields.organizationId, organizationId),
          fns.eq(fields.isActive, true)
        )
      )
      .build();

    const customers = await tx.query(customerPlan);
    let customer = customers[0];

    // 4. Create customer if one does not exist
    if (!customer) {
      const customerInsertPlan = tx.sql.public.customer
        .insert([
          {
            name: input.name,
            email: input.email,
            phone: input.phone,
            organizationId,
            isActive: true,
          },
        ])
        .returning(
          "id",
          "name",
          "email",
          "phone",
          "organizationId"
        )
        .build();

      const createdCustomers = await tx.query(
        customerInsertPlan
      );

      customer = createdCustomers[0];

      if (!customer) {
        throw new Error("Failed to create customer.");
      }
    }

    // 5. Fetch published products belonging to this store
    const productPlan = tx.sql.public.product
      .select(
        "id",
        "name",
        "salePrice",
        "stockQuantity",
        "organizationId",
        "isActive",
        "isPublished",
        "deletedAt"
      )
      .where((fields, fns) =>
        fns.and(
          fns.in(fields.id, productIds),
          fns.eq(fields.organizationId, organizationId),
          fns.eq(fields.isActive, true),
          fns.eq(fields.isPublished, true),
          fns.raw`${fields.deletedAt} IS NULL`.returns("pg/bool@1")
        )
      )
      .build();

    const products = await tx.query(productPlan);

    if (products.length !== productIds.length) {
      throw new Error(
        "One or more products are unavailable in this store."
      );
    }

    // 6. Validate stock and calculate trusted prices
    const orderItems = input.items.map((item) => {
      const product = products.find(
        (product) => product.id === item.productId
      );

      if (!product) {
        throw new Error("Product not found.");
      }

      if (item.quantity > product.stockQuantity) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}.`
        );
      }

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.salePrice,
        productName: product.name,
      };
    });

    // 7. Calculate total using database prices
    const totalAmount = orderItems.reduce(
      (total, item) =>
        total + item.quantity * item.unitPrice,
      0
    );

    if (totalAmount <= 0) {
      throw new Error("Order total must be greater than zero.");
    }

    // 8. Create order with shipping information
    const orderPlan = tx.sql.public.order
      .insert([
        {
          customerId: customer.id,
          organizationId,
          status: "PENDING",
          shippingStatus: "NOT_SHIPPED",
          totalAmount,
          shippingName: input.name,
          shippingEmail: input.email,
          shippingPhone: input.phone,
          shippingAddress: input.address,
          shippingCity: input.city,
          deliveryInstructions:
            input.deliveryInstructions ?? null,
        },
      ])
      .returning(
        "id",
        "customerId",
        "organizationId",
        "status",
        "shippingStatus",
        "totalAmount",
        "shippingName",
        "shippingEmail",
        "shippingPhone",
        "shippingAddress",
        "shippingCity",
        "deliveryInstructions"
      )
      .build();

    const orders = await tx.query(orderPlan);
    const order = orders[0];

    if (!order) {
      throw new Error("Failed to create order.");
    }

    // 9. Update stock and record inventory movements
    for (const item of orderItems) {
      const product = products.find(
        (product) => product.id === item.productId
      );

      if (!product) {
        throw new Error("Product not found.");
      }

      const newStockQuantity =
        product.stockQuantity - item.quantity;

      const updateProductPlan = tx.sql.public.product
        .update({
          stockQuantity: newStockQuantity,
        })
        .where((fields, fns) =>
         fns.and(
  fns.eq(fields.id, item.productId),
  fns.eq(fields.organizationId, organizationId),
  fns.eq(fields.isActive, true),
  fns.eq(fields.isPublished, true),
  fns.raw`${fields.deletedAt} IS NULL`.returns("pg/bool@1"),
  fns.eq(fields.stockQuantity, product.stockQuantity),
  fns.raw`${fields.stockQuantity} >= ${item.quantity}`.returns("pg/bool@1")
)
        )
        .returning("id", "stockQuantity")
        .build();

      const updatedProducts = await tx.query(
        updateProductPlan
      );

      if (!updatedProducts[0]) {
        throw new Error(
          `Stock update failed for "${item.productName}". Please try again.`
        );
      }

      const movementPlan = tx.sql.public.inventoryMovement
        .insert([
          {
            productId: item.productId,
            organizationId,
            createdBy: null,
            quantity: -item.quantity,
            type: "SALE",
            reason: `Guest checkout order #${order.id}`,
          },
        ])
        .returning("id", "productId", "quantity", "type")
        .build();

      const movements = await tx.query(movementPlan);

      if (!movements[0]) {
        throw new Error("Failed to record inventory movement.");
      }
    }

    // 10. Create order items
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

    const createdOrderItems = await tx.query(
      orderItemPlan
    );

    // 11. Create COD payment
    const paymentPlan = tx.sql.public.payment
      .insert([
        {
          orderId: order.id,
          organizationId,
          amount: totalAmount,
          currency: "PKR",
          method: "COD",
          status: "PENDING",
          gateway: null,
          gatewayTransactionId: null,
        },
      ])
      .returning(
        "id",
        "orderId",
        "organizationId",
        "amount",
        "currency",
        "method",
        "status"
      )
      .build();

    const payments = await tx.query(paymentPlan);
    const payment = payments[0];

    if (!payment) {
      throw new Error("Failed to create COD payment.");
    }

    // 12. Return order confirmation data
    return {
      order,
      items: createdOrderItems,
      payment,
    };
  });
}
