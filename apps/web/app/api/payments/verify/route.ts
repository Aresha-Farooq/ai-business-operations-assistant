import { NextRequest, NextResponse } from "next/server";

import { verifyPayment } from "@business-platform/business/payment/verify-payment";
import { MockPaymentGateway } from "@business-platform/business/payment/mock-gateway";
import { verifyPaymentSchema } from "@business-platform/validation/payment";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const input = verifyPaymentSchema.parse(body);

    const gateway = new MockPaymentGateway();

    const result = await verifyPayment(
      input.transactionId,
      gateway
    );

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error) {
    console.error("Payment verification failed:", error);

    return NextResponse.json(
      { error: "Unable to verify payment." },
      { status: 500 }
    );
  }
}