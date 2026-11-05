
import { NextResponse } from "next/server";

import {
  getProductStockHistory,
} from "@business-platform/business/inventory";

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

    const movements = await getProductStockHistory(productId);

    return NextResponse.json(
      { movements },
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

    console.error("PRODUCT STOCK HISTORY ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch product stock history." },
      { status: 500 }
    );
  }
}
