import { db, getDbRuntime } from "@business-platform/database";
import { requireCurrentUser } from "@business-platform/auth/session";
import type { CreateTicketInput } from "@business-platform/validation/ticket";

export async function createTicket(input: CreateTicketInput) {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  // Verify that the customer belongs to the user's organization.
  const customerPlan = db.sql.public.customer
    .select("id")
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, input.customerId),
        fns.eq(fields.organizationId, user.organizationId),
        fns.eq(fields.isActive, true)
      )
    )
    .build();

  const customers = await runtime.query(customerPlan);
  const customer = customers[0];

  if (!customer) {
    throw new Error("Customer not found in your organization.");
  }

  // Create the ticket using the trusted organization ID.
  const ticketPlan = db.sql.public.ticket
    .insert([
      {
        organizationId: user.organizationId,
        customerId: input.customerId,
        subject: input.subject,
        description: input.description,
        priority: input.priority,
      },
    ])
    .returning(
      "id",
      "organizationId",
      "customerId",
      "subject",
      "description",
      "priority",
      "status",
      "assigneeId",
      "createdAt",
      "updatedAt"
    )
    .build();

  const tickets = await runtime.query(ticketPlan);
  const ticket = tickets[0];

  if (!ticket) {
    throw new Error("Failed to create ticket.");
  }

  return ticket;
}

export async function getTickets() {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  const ticketPlan = db.sql.public.ticket
    .select(
      "id",
      "customerId",
      "subject",
      "description",
      "priority",
      "status",
      "assigneeId",
      "createdAt",
      "updatedAt"
    )
    .where((fields, fns) =>
      fns.eq(fields.organizationId, user.organizationId)
    )
    .build();

  return await runtime.query(ticketPlan);
}

export async function getTicketById(ticketId: number) {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  const ticketPlan = db.sql.public.ticket
    .select(
      "id",
      "organizationId",
      "customerId",
      "subject",
      "description",
      "priority",
      "status",
      "assigneeId",
      "createdAt",
      "updatedAt"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, ticketId),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .build();

  const tickets = await runtime.query(ticketPlan);
  const ticket = tickets[0];

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  return ticket;
}
