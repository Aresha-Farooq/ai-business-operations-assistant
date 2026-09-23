import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
      deleteProduct,
  getProductById,
  updateProduct,
} from "@business-platform/business/product";

import { updateProductSchema } from "@business-platform/validation/product";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { error: "Invalid product ID." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const validatedData = updateProductSchema.parse(body);

    const updatedProduct = await updateProduct(
      productId,
      validatedData
    );

    return NextResponse.json(updatedProduct, {
      status: 200,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid product data.",
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

      if (error.message === "Product not found.") {
        return NextResponse.json(
          { error: "Product not found." },
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

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { error: "Invalid product ID." },
        { status: 400 }
      );
    }

    const product = await getProductById(productId);

    return NextResponse.json(product, {
      status: 200,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Not authenticated.") {
        return NextResponse.json(
          { error: "Not authenticated." },
          { status: 401 }
        );
      }

      if (error.message === "Product not found.") {
        return NextResponse.json(
          { error: "Product not found." },
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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { error: "Invalid product ID." },
        { status: 400 }
      );
    }

    const deletedProduct = await deleteProduct(productId);

    return NextResponse.json(
      {
        message: "Product deleted successfully.",
        product: deletedProduct,
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

      if (error.message === "Product not found.") {
        return NextResponse.json(
          { error: "Product not found." },
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