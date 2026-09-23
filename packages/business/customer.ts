import { db, getDbRuntime } from "@business-platform/database";
import { requireCurrentUser } from "@business-platform/auth/session";

export async function getCustomers() {
 const user = await requireCurrentUser();

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
  fns.and(
    fns.eq(fields.organizationId, user.organizationId),
    fns.eq(fields.isActive, true)
  )
)
    .build();

  return runtime.query(plan);
}

export async function createCustomer(input: {
  name: string;
  email: string;
  phone?: string;
}) {
 const user = await requireCurrentUser();

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
export async function getCustomerById(customerId: number) {

  const user = await requireCurrentUser();
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
   fns.and(
  fns.eq(fields.id, customerId),
  fns.eq(fields.organizationId, user.organizationId),
  fns.eq(fields.isActive, true)
)
  )
  .build();

  const customers = await runtime.query(plan);
const customer = customers[0];

if (!customer) {
  throw new Error("Customer not found.");
}

return customer;
}
type UpdateCustomerInput = {
  name?: string;
  email?: string;
  phone?: string;
};
export async function updateCustomer(
  customerId: number,
  input: UpdateCustomerInput
) {
 const user = await requireCurrentUser();
 const runtime = await getDbRuntime();
}

//Delete customer
export async function deleteCustomer(customerId: number) {
  const user = await requireCurrentUser();

  const runtime = await getDbRuntime();

  const plan = db.sql.public.customer
    .update({
      isActive: false,
      deletedAt: new Date(),
    })
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, customerId),
        fns.eq(fields.organizationId, user.organizationId),
        fns.eq(fields.isActive, true)
      )
    )
    .returning(
      "id",
      "name",
      "email",
      "phone",
      "organizationId",
      "isActive",
      "deletedAt",
      "createdAt",
      "updatedAt"
    )
    .build();

  const customers = await runtime.query(plan);

  const customer = customers[0];

  if (!customer) {
    throw new Error("Customer not found.");
  }

  return customer;
}
