import { NextResponse } from "next/server";
import { getCustomerById } from "@business-platform/business/customer";
import { ZodError } from "zod";
import { updateCustomer } from "@business-platform/business/customer";
import { updateCustomerSchema } from "@business-platform/validation/customer";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // implementation
  const { id } = await context.params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId) || customerId <= 0) {
  return NextResponse.json(
    { error: "Invalid customer ID." },
    { status: 400 }
  );
}
try {
  const customer = await getCustomerById(customerId);

  return NextResponse.json(customer, { status: 200 });
}
catch (error) {
  if (error instanceof Error) {
    if (error.message === "Not authenticated.") {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    if (error.message === "Customer not found.") {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 }
      );
    }
  }

  return NextResponse.json(
    { error: "Internal server error." },
    { status: 500 }
  );
}
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const customerId = Number(id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json(
        { error: "Invalid customer ID." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const validatedData = updateCustomerSchema.parse(body);

    const updatedCustomer = await updateCustomer(
      customerId,
      validatedData
    );

    return NextResponse.json(updatedCustomer, {
      status: 200,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid customer data.",
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

      if (error.message === "Customer not found.") {
        return NextResponse.json(
          { error: "Customer not found." },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

