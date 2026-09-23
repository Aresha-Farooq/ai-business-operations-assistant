import { NextResponse } from "next/server";
import { getCustomers , createCustomer} from "@business-platform/business/customer";
import { createCustomerSchema } from "@business-platform/validation/customer";
import { ZodError } from "zod";
import { getCustomerById } from "@business-platform/business/customer";
export async function GET() {
  try {
    const customers = await getCustomers();

    return NextResponse.json({
      customers,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated.") {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    console.error("GET CUSTOMERS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch customers." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

  

const validatedData = createCustomerSchema.parse(body);

const customer = await createCustomer(validatedData);

    return NextResponse.json(
      { customer },
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

    console.error("CREATE CUSTOMER ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create customer." },
      { status: 500 }
    );
  }
}