import { authErrorResponse } from "@/lib/api-auth-errors";
import { NextRequest, NextResponse } from "next/server";
import { getOrders } from "@business-platform/business/order-query";
import { createOrder } from "@business-platform/business/order";
import { createOrderSchema } from "@business-platform/validation/order";
import { ZodError } from "zod";

export async function GET() {
  try {
    const orders = await getOrders();
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof Error) {
      if (error.message === "Not authenticated.") {
        return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
      }
      if (error.message === "Forbidden.") {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createOrderSchema.parse(body);
    const order = await createOrder(input);

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid order data." },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === "Not authenticated.") {
        return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
      }
      if (error.message === "Forbidden.") {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}