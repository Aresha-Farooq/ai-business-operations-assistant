
import { authErrorResponse } from "@/lib/api-auth-errors";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  getProducts,
  createProduct,
} from "@business-platform/business/product";

import {
  createProductSchema,
} from "@business-platform/validation/product";

export async function GET() {
  try {
    const products = await getProducts();

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (
      error instanceof Error &&
      error.message === "Not authenticated."
    ) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    console.error("GET PRODUCTS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch products." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const validatedData = createProductSchema.parse(body);

    const product = await createProduct(validatedData);

    return NextResponse.json(
      { product },
      { status: 201 }
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "Not authenticated."
    ) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    console.error("CREATE PRODUCT ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create product." },
      { status: 500 }
    );
  }
}
