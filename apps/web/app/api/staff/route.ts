
import { NextResponse } from "next/server";
import {
  getAllStaff,
  createStaff,
} from "@business-platform/business/staff";
import { createStaffSchema } from "@business-platform/validation/staff";
import { ZodError } from "zod";

// GET: Retrieve all active staff members
export async function GET() {
  try {
    const staff = await getAllStaff();

    return NextResponse.json({ staff });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated.") {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message === "Forbidden.") {
      return NextResponse.json(
        { error: "You do not have permission to manage staff." },
        { status: 403 }
      );
    }

    console.error("GET STAFF ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch staff." },
      { status: 500 }
    );
  }
}

// POST: Create a new staff member
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validatedData = createStaffSchema.parse(body);

    const staff = await createStaff(validatedData);

    return NextResponse.json(
      { staff },
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

    if (error instanceof Error && error.message === "Forbidden.") {
      return NextResponse.json(
        { error: "You do not have permission to manage staff." },
        { status: 403 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "An account with this email already exists."
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    console.error("CREATE STAFF ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create staff member." },
      { status: 500 }
    );
  }
}
