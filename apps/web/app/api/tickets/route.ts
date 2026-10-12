
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createTicket } from "@business-platform/business/ticket";
import { createTicketSchema } from "@business-platform/validation/ticket";
import { getTickets } from "@business-platform/business/ticket";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = createTicketSchema.parse(body);

    const ticket = await createTicket(validatedData);

    return NextResponse.json({ ticket }, { status: 201 });
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

      if (error.message === "Customer not found in your organization.") {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    console.error("CREATE TICKET ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create ticket." },
      { status: 500 }
    );
  }
}



export async function GET() {
  try {
    const tickets = await getTickets();

    return NextResponse.json({ tickets }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated.") {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    console.error("GET TICKETS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch tickets." },
      { status: 500 }
    );
  }
}
