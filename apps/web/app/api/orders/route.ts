import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getOrders } from "@business-platform/business/order-query";
import { createOrder } from "@business-platform/business/order";
import { createOrderSchema } from "@business-platform/validation/order";
import {
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "@business-platform/business/customer";
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request data before business logic
    const validatedData = createOrderSchema.parse(body);

    // Only validated data reaches the business layer
    const order = await createOrder(validatedData);
return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid order data.",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === "Not authenticated.") {
        return NextResponse.json(
          { error: "Not authenticated." },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const orders = await getOrders();

    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Not authenticated.") {
        return NextResponse.json(
          { error: "Not authenticated." },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
