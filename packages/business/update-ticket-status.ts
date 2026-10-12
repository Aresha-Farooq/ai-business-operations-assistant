import { db, getDbRuntime } from "@business-platform/database";
import { requireCurrentUser } from "@business-platform/auth/session";
import type { UpdateTicketStatusInput } from "@business-platform/validation/ticket";
import { canTransitionTicketStatus } from "./ticket-status";

export async function updateTicketStatus(
  ticketId: number,
  input: UpdateTicketStatusInput
) {
  const user = await requireCurrentUser();
  const runtime = await getDbRuntime();

  const findPlan = db.sql.public.ticket
    .select("id", "status")
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, ticketId),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .build();

  const tickets = await runtime.query(findPlan);
  const ticket = tickets[0];
if (
  !canTransitionTicketStatus(
    ticket.status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
    input.status
  )
) {
  throw new Error("Invalid ticket status transition.");
}
  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  const updatePlan = db.sql.public.ticket
    .update({ status: input.status })
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, ticketId),
        fns.eq(fields.organizationId, user.organizationId)
      )
    )
    .returning(
      "id",
      "subject",
      "status",
      "priority",
      "updatedAt"
    )
    .build();

  const updatedTickets = await runtime.query(updatePlan);

  if (!updatedTickets[0]) {
    throw new Error("Failed to update ticket.");
  }

  return updatedTickets[0];
}
