
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { updateTicketStatus } from "@business-platform/business/update-ticket-status";
import { updateTicketStatusSchema } from "@business-platform/validation/ticket";
import { getTicketById } from "@business-platform/business/ticket";
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
    const validatedData = updateTicketStatusSchema.parse(body);

    const ticket = await updateTicketStatus(ticketId, validatedData);

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
          { error: "Not authenticated." },
          { status: 401 }
        );
      }

      if (error.message === "Ticket not found.") {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    console.error("UPDATE TICKET ERROR:", error);

    return NextResponse.json(
      { error: "Failed to update ticket." },
      { status: 500 }
    );
  }
}

export async function GET(
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

    const ticket = await getTicketById(ticketId);

    return NextResponse.json({ ticket }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Not authenticated.") {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        );
      }

      if (error.message === "Ticket not found.") {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    console.error("GET TICKET ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch ticket." },
      { status: 500 }
    );
  }
}
