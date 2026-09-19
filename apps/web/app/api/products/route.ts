import { NextResponse } from "next/server";
import {
  getProducts,
  createProduct,
} from "@business-platform/business/product";

import { ZodError } from "zod";
import { createProductSchema } from "@business-platform/validation/product";
export async function GET() {
  try {
    const products = await getProducts();

    return NextResponse.json({
      products,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated.") {
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
   const body = await request.json();

const validatedData = createProductSchema.parse(body);

const product = await createProduct(validatedData);

    return NextResponse.json(
      { product },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed.",
      details: error.flatten().fieldErrors,
    },
    { status: 400 }
  );
}
    if (error instanceof Error && error.message === "Not authenticated.") {
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