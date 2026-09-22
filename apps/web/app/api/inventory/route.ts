import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { changeStock } from "@business-platform/business/inventory";
import { getInventoryMovements } from "@business-platform/business/inventory-query";
import { changeStockSchema } from "@business-platform/validation/inventory";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validatedData = changeStockSchema.parse(body);

    const result = await changeStock(validatedData);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid inventory data.",
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

      if (error.message === "Insufficient stock.") {
        return NextResponse.json(
          { error: "Insufficient stock." },
          { status: 400 }
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

export async function GET() {
  try {
    const movements = await getInventoryMovements();

    return NextResponse.json(movements, { status: 200 });
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