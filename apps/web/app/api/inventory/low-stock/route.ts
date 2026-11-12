
import { authErrorResponse } from "@/lib/api-auth-errors";
import { NextResponse } from "next/server";

import {
  getLowStockProducts,
} from "@business-platform/business/inventory";

export async function GET() {
  try {
    const products = await getLowStockProducts();

    return NextResponse.json(
      { products },
      { status: 200 }
    );
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

    console.error("LOW STOCK ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch low-stock products." },
      { status: 500 }
    );
  }
}
