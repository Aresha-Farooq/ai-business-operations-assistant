import { db, getDbRuntime } from "@business-platform/database";
import { requireCurrentUser } from "@business-platform/auth/session";

export async function getOverdueInvoices() {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();
  const now = new Date();

  const invoicesPlan = db.sql.public.invoice
    .select(
      "id",
      "invoiceNumber",
      "organizationId",
      "orderId",
      "amount",
      "currency",
      "issueDate",
      "dueDate",
      "status"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.organizationId, user.organizationId),
        fns.eq(fields.status, "ISSUED"),
        fns.lt(fields.dueDate, now)
      )
    )
    .build();

  const invoices = await runtime.query(invoicesPlan);

  return {
    organizationId: user.organizationId,
    totalOverdueInvoices: invoices.length,
    totalOverdueAmount: invoices.reduce(
      (total, invoice) => total + invoice.amount,
      0
    ),
    invoices,
  };
}