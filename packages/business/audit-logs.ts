
import { db, getDbRuntime } from "@business-platform/database";
import { requirePermission } from "@business-platform/auth/authorization";
import type { AuditStatus } from "@business-platform/database";

export interface GetAuditLogsInput {
  page?: number;
  pageSize?: number;
  status?: AuditStatus;
  toolName?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
}

export async function getAuditLogs(input: GetAuditLogsInput = {}) {
  const user = await requirePermission("audit:read");

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
  const offset = (page - 1) * pageSize;

  // Convert selected dates into Pakistan-time boundaries.
  const startDate = input.startDate
    ? new Date(`${input.startDate}T00:00:00+05:00`).toISOString()
    : undefined;

  let endDateExclusive: string | undefined;

  if (input.endDate) {
    const nextDay = new Date(`${input.endDate}T00:00:00+05:00`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    endDateExclusive = nextDay.toISOString();
  }

  const runtime = await getDbRuntime();

  const logsQuery = db.sql.public.auditLog
    .select(
      "id",
      "organizationId",
      "userId",
      "action",
      "toolName",
      "status",
      "errorMessage",
      "createdAt"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.organizationId, user.organizationId),
        ...(input.status
          ? [fns.eq(fields.status, input.status)]
          : []),
        ...(input.toolName
          ? [fns.eq(fields.toolName, input.toolName)]
          : []),
        ...(input.userId !== undefined
          ? [fns.eq(fields.userId, input.userId)]
          : []),
        ...(startDate
          ? [fns.gte(fields.createdAt, startDate)]
          : []),
        ...(endDateExclusive
          ? [fns.lt(fields.createdAt, endDateExclusive)]
          : [])
      )
    )
    .orderBy("createdAt", { direction: "desc" })
    .limit(pageSize)
    .offset(offset)
    .build();

  const logs = await runtime.query(logsQuery);

  return {
    logs,
    pagination: {
      page,
      pageSize,
    },
  };
}
