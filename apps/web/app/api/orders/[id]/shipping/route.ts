import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { authErrorResponse } from "@/lib/api-auth-errors";
import { orderLifecycleErrorResponse } from "@/lib/order-lifecycle-errors";
import { updateShippingStatus } from "@business-platform/business/update-shipping-status";
import { shippingStatusSchema } from "@business-platform/validation/order-status";

export async function PATCH(
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

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const shippingStatus = shippingStatusSchema.parse(
      (body as { shippingStatus?: unknown } | null)?.shippingStatus
    );

    // organizationId is never read from the request: the business
    // function derives it from the authenticated session.
    const updatedOrder = await updateShippingStatus({
      orderId,
      shippingStatus,
    });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const lifecycleResponse = orderLifecycleErrorResponse(error);
    if (lifecycleResponse) return lifecycleResponse;

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid shipping status.",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error("ORDER LIFECYCLE ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
