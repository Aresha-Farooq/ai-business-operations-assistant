import { NextResponse } from "next/server";
import { getLowStockProducts } from "@business-platform/business/low-stock";

export async function GET() {
  try {
    const products = await getLowStockProducts();

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Not authenticated.") {
        return NextResponse.json(
          { error: "Not authenticated." },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}