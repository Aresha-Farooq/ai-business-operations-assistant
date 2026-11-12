
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { guestCheckoutSchema } from "@business-platform/validation/checkout";
import { createGuestCheckoutOrder } from "@business-platform/business/guest-checkout";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    // Validate customer details and cart items
    const validatedData = guestCheckoutSchema.parse(body);

    // Create guest order using the storefront slug
    const result = await createGuestCheckoutOrder(
      slug,
      validatedData
    );

    return NextResponse.json(result, { status: 201 });
   } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid checkout data.",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON request." },
        { status: 400 }
      );
    }

    console.error("GUEST CHECKOUT ERROR:", error);

    return NextResponse.json(
      { error: "Unable to place your order. Please try again." },
      { status: 500 }
    );
  }}
