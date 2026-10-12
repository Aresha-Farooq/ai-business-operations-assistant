import { db, getDbRuntime } from "@business-platform/database";
import { requireRole } from "@business-platform/auth/authorization";
import type { AssignTicketInput } from "@business-platform/validation/ticket";

export async function assignTicket(
  ticketId: number,
  input: AssignTicketInput
) {
const currentUser = await requireRole(["OWNER", "MANAGER"]);
  const runtime = await getDbRuntime();

  // Check that the ticket belongs to the current organization.
  const ticketPlan = db.sql.public.ticket
    .select("id")
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, ticketId),
        fns.eq(fields.organizationId, currentUser.organizationId)
      )
    )
    .build();

  const tickets = await runtime.query(ticketPlan);

  if (!tickets[0]) {
    throw new Error("Ticket not found.");
  }

  // Check that the assignee belongs to the same organization.
  const userPlan = db.sql.public.user
    .select("id", "organizationId", "role")
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, input.assigneeId),
        fns.eq(fields.organizationId, currentUser.organizationId)
      )
    )
    .build();

  const users = await runtime.query(userPlan);
  const assignee = users[0];

  if (!assignee) {
    throw new Error("Assignee not found in your organization.");
  }

  if (assignee.role !== "STAFF" && assignee.role !== "MANAGER") {
    throw new Error("Only staff or managers can be assigned tickets.");
  }

  // Assign the ticket within the current organization.
  const updatePlan = db.sql.public.ticket
    .update({ assigneeId: input.assigneeId })
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, ticketId),
        fns.eq(fields.organizationId, currentUser.organizationId)
      )
    )
    .returning("id", "subject", "assigneeId", "status", "updatedAt")
    .build();

  const updatedTickets = await runtime.query(updatePlan);
  const updatedTicket = updatedTickets[0];

  if (!updatedTicket) {
    throw new Error("Failed to assign ticket.");
  }

  return updatedTicket;
}
