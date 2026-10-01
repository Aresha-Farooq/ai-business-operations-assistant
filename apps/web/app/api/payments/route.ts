import { NextRequest, NextResponse } from "next/server";
import { createPayment } from "@business-platform/business/payment";
import { createPaymentSchema } from "@business-platform/validation/payment";
import { MockPaymentGateway } from "@business-platform/business/payment/mock-gateway";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const input = createPaymentSchema.parse(body);

    const gateway = new MockPaymentGateway();

    const result = await createPayment(input, gateway);

    return NextResponse.json(result, {
      status: 201,
    });
  } catch (error) {
    console.error("Payment creation failed:", error);

    return NextResponse.json(
      { error: "Unable to create payment." },
      { status: 500 }
    );
  }
}