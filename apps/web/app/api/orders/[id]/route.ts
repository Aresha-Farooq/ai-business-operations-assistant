import { NextResponse } from "next/server";
import { getOrderById } from "@business-platform/business/order-query";
import {
  deleteCustomer,
  getCustomerById,
  updateCustomer,
} from "@business-platform/business/customer";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const orderId = Number(id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { error: "Invalid order ID." },
        { status: 400 }
      );
    }

    const order = await getOrderById(orderId);

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Not authenticated.") {
        return NextResponse.json(
          { error: "Not authenticated." },
          { status: 401 }
        );
      }

      if (error.message === "Order not found.") {
        return NextResponse.json(
          { error: "Order not found." },
          { status: 404 }
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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const customerId = Number(id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json(
        { error: "Invalid customer ID." },
        { status: 400 }
      );
    }

    const deletedCustomer = await deleteCustomer(customerId);

    return NextResponse.json(
      {
        message: "Customer deleted successfully.",
        customer: deletedCustomer,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Not authenticated.") {
        return NextResponse.json(
          { error: "Not authenticated." },
          { status: 401 }
        );
      }

      if (error.message === "Customer not found.") {
        return NextResponse.json(
          { error: "Customer not found." },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}