import "dotenv/config";
import { createOrder } from "./order.js";

async function testCreateOrder() {
  try {
    const order = await createOrder({
      customerId: 1,
      items: [
        {
          productId: 1,
          quantity: 2,
        },
      ],
    });

    console.log("Created order:");
    console.dir(order, { depth: null });
  } catch (error) {
    console.error(
      "Order creation failed:",
      error instanceof Error ? error.message : error
    );
  }
}

testCreateOrder();