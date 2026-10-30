import { db, getDbRuntime } from "@business-platform/database";
import { requireCurrentUser } from "@business-platform/auth/session";

export async function getInvoice(invoiceId: number) {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  const invoicePlan = db.sql.public.invoice
    .select(
      "id",
      "invoiceNumber",
      "organizationId",
      "orderId",
      "amount",
      "currency",
      "issueDate",
      "dueDate",
      "status",
      "createdAt",
      "updatedAt"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, invoiceId),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .build();

  const invoices = await runtime.query(invoicePlan);

  return invoices[0] ?? null;
}

export async function getInvoiceIds() {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  const invoicePlan = db.sql.public.invoice
    .select("id", "invoiceNumber", "status")
    .where((fields, fns) =>
      fns.eq(fields.organizationId, user.organizationId)
    )
    .build();

  return runtime.query(invoicePlan);
}

export async function checkInvoiceForOrder(orderId: number) {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  const invoicePlan = db.sql.public.invoice
    .select("id", "invoiceNumber", "orderId", "status")
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.orderId, orderId),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .build();

  return runtime.query(invoicePlan);
}
export async function createTestInvoice(orderId: number) {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  // Find the order belonging to the authenticated organization.
  const orderPlan = db.sql.public.order
    .select("id", "organizationId", "totalAmount")
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, orderId),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .build();

  const orders = await runtime.query(orderPlan);
  const order = orders[0];

  if (!order) {
    throw new Error("Order not found.");
  }

  const invoicePlan = db.sql.public.invoice
    .insert([
      {
        invoiceNumber: `TEST-INV-${Date.now()}`,
        organizationId: user.organizationId,
        orderId: order.id,
        amount: order.totalAmount,
        currency: "PKR",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "DRAFT",
      },
    ])
    .returning(
      "id",
      "invoiceNumber",
      "orderId",
      "amount",
      "status"
    )
    .build();

  const invoices = await runtime.query(invoicePlan);

  return invoices[0];
}