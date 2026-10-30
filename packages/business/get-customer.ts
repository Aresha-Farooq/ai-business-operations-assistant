import { db, getDbRuntime } from "@business-platform/database";
import { requireCurrentUser } from "@business-platform/auth/session";

export type CustomerDetails = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  organizationId: number;
  isActive: boolean;
};

export async function getCustomer(customerId: number) {
  if (!Number.isSafeInteger(customerId) || customerId <= 0) {
    throw new Error("Customer ID must be a positive safe integer.");
  }

  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  const customerPlan = db.sql.public.customer
    .select(
      "id",
      "name",
      "email",
      "phone",
      "organizationId",
      "isActive"
    )
    
    .where((fields, fns) =>
  fns.and(
    fns.eq(fields.id, customerId),
    fns.eq(fields.organizationId, user.organizationId),
    fns.eq(fields.isActive, true)
  )
)
    
    .build();

  const customers = await runtime.query(customerPlan);

  return customers[0] ?? null;
}