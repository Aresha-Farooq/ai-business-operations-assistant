
import { db, getDbRuntime } from "./prisma/db.js";
import type { AuditStatus } from "./audit-log.js";

export interface GetAuditLogsInput {
  organizationId: number;
  page?: number;
  pageSize?: number;
  status?: AuditStatus;
  toolName?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
}

export async function getAuditLogs(input: GetAuditLogsInput) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
  const offset = (page - 1) * pageSize;

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
        fns.eq(fields.organizationId, input.organizationId),
        ...(input.status
          ? [fns.eq(fields.status, input.status)]
          : []),
        ...(input.toolName
          ? [fns.eq(fields.toolName, input.toolName)]
          : []),
        ...(input.userId !== undefined
          ? [fns.eq(fields.userId, input.userId)]
          : []),
        ...(input.startDate
          ? [fns.gte(fields.createdAt, input.startDate)]
          : []),
        ...(input.endDate
          ? [fns.lte(fields.createdAt, input.endDate)]
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
