
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { assignTicket } from "@business-platform/business/assign-ticket";
import { assignTicketSchema } from "@business-platform/validation/ticket";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const ticketId = Number(id);

    if (!Number.isSafeInteger(ticketId) || ticketId <= 0) {
      return NextResponse.json(
        { error: "Invalid ticket ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = assignTicketSchema.parse(body);

    const ticket = await assignTicket(ticketId, validatedData);

    return NextResponse.json({ ticket }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed.", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === "Not authenticated.") {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        );
      }

      if (
        error.message === "Ticket not found." ||
        error.message === "Assignee not found in your organization."
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (error.message === "Only staff or managers can be assigned tickets.") {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    console.error("ASSIGN TICKET ERROR:", error);

    return NextResponse.json(
      { error: "Failed to assign ticket." },
      { status: 500 }
    );
  }
}
