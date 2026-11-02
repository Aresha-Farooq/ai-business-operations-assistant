
import { db, getDbRuntime } from "./prisma/db.js";

export type AuditStatus = "SUCCESS" | "FAILURE" | "DENIED";

export interface CreateAuditLogInput {
  organizationId: number;
  userId?: number | null;
  action: string;
  toolName?: string | null;
  status: AuditStatus;
  errorMessage?: string | null;
}

export async function createAuditLog(input: CreateAuditLogInput) {
  const runtime = await getDbRuntime();

  const query = db.sql.public.auditLog
    .insert([
      {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        action: input.action,
        toolName: input.toolName ?? null,
        status: input.status,
        errorMessage: input.errorMessage ?? null,
      },
    ])
    .returning("id", "action", "status", "createdAt")
    .build();

  const result = await runtime.query(query);

  return result;
}
