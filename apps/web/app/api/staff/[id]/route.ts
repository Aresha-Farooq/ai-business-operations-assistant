import { NextResponse } from "next/server";
import {
  updateStaff,
  deactivateStaff,
} from "@business-platform/business/staff";

import { updateStaffSchema } from "@business-platform/validation/staff";
import { ZodError } from "zod";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH: Update a staff member
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const staffId = Number(id);

    // Validate staff ID
    if (!Number.isInteger(staffId) || staffId <= 0) {
      return NextResponse.json(
        { error: "Invalid staff ID." },
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = updateStaffSchema.parse(body);

    // Update staff
    const staff = await updateStaff(staffId, validatedData);

    return NextResponse.json(
      { staff },
      { status: 200 }
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

    if (error instanceof Error) {
      if (error.message === "Not authenticated.") {
        return NextResponse.json(
          { error: "Not authenticated." },
          { status: 401 }
        );
      }

      if (error.message === "Forbidden.") {
        return NextResponse.json(
          { error: "You do not have permission to manage staff." },
          { status: 403 }
        );
      }

      if (error.message === "Staff member not found.") {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (
        error.message === "You cannot update an owner account." ||
        error.message === "You cannot change your own role."
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }

    console.error("UPDATE STAFF ERROR:", error);

    return NextResponse.json(
      { error: "Failed to update staff member." },
      { status: 500 }
    );
  }
}

// DELETE: Deactivate a staff member
export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const staffId = Number(id);

    // Validate staff ID
    if (!Number.isInteger(staffId) || staffId <= 0) {
      return NextResponse.json(
        { error: "Invalid staff ID." },
        { status: 400 }
      );
    }

    // Deactivate staff
    const staff = await deactivateStaff(staffId);

    return NextResponse.json(
      {
        message: "Staff member deactivated successfully.",
        staff,
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

      if (error.message === "Forbidden.") {
        return NextResponse.json(
          { error: "You do not have permission to manage staff." },
          { status: 403 }
        );
      }

      if (
        error.message === "Staff member not found or already inactive."
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (
        error.message === "You cannot deactivate an owner account." ||
        error.message === "You cannot deactivate your own account."
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }

    console.error("DEACTIVATE STAFF ERROR:", error);

    return NextResponse.json(
      { error: "Failed to deactivate staff member." },
      { status: 500 }
    );
  }
}
