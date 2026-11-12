
import { authErrorResponse } from "@/lib/api-auth-errors";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  changeStock,
  getInventoryMovements,
} from "@business-platform/business/inventory";

import {
  inventoryMovementSchema,
} from "@business-platform/validation/inventory";

// GET: Retrieve inventory movement history

export async function GET() {
  try {
    const movements = await getInventoryMovements();

    return NextResponse.json(
      { movements },
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

    console.error("GET INVENTORY MOVEMENTS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch inventory movements." },
      { status: 500 }
    );
  }
}

// POST: Create inventory movement

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

    const validatedData = inventoryMovementSchema.parse(body);

    const result = await changeStock(validatedData);

    return NextResponse.json(
      {
        message: "Inventory movement recorded successfully.",
        ...result,
      },
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

    if (error instanceof Error) {
      if (error.message === "Not authenticated.") {
        return NextResponse.json(
          { error: "Not authenticated." },
          { status: 401 }
        );
      }

      if (
        error.message === "Product not found." ||
        error.message === "Insufficient stock." ||
        error.message === "Adjustment direction is required."
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    console.error("CREATE INVENTORY MOVEMENT ERROR:", error);

    return NextResponse.json(
      { error: "Failed to record inventory movement." },
      { status: 500 }
    );
  }
}
