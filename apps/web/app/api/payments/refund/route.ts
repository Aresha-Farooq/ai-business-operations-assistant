import { NextRequest, NextResponse } from "next/server";

import { refundPayment } from "@business-platform/business/payment/refund-payment";
import { MockPaymentGateway } from "@business-platform/business/payment/mock-gateway";
import { refundPaymentSchema } from "@business-platform/validation/payment";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const input = refundPaymentSchema.parse(body);

    const gateway = new MockPaymentGateway();

    const result = await refundPayment(
      input.paymentId,
      gateway
    );

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error) {
    console.error("Payment refund failed:", error);

    return NextResponse.json(
      { error: "Unable to refund payment." },
      { status: 500 }
    );
  }
}