import { db, getDbRuntime } from "@business-platform/database";
import { getCurrentUser } from "@business-platform/auth/session";

export async function getCustomers() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const runtime = await getDbRuntime();

  const plan = db.sql.public.customer
    .select(
      "id",
      "name",
      "email",
      "phone",
      "organizationId",
      "createdAt",
      "updatedAt"
    )
    .where((fields, fns) =>
      fns.eq(fields.organizationId, user.organizationId)
    )
    .build();

  return runtime.query(plan);
}

export async function createCustomer(input: {
  name: string;
  email: string;
  phone?: string;
}) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const runtime = await getDbRuntime();

  const plan = db.sql.public.customer
    .insert([
      {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        organizationId: user.organizationId,
      },
    ])
    .returning(
      "id",
      "name",
      "email",
      "phone",
      "organizationId",
      "createdAt",
      "updatedAt"
    )
    .build();

  const customers = await runtime.query(plan);

  return customers[0];
}
