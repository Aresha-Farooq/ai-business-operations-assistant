
import { db, getDbRuntime } from "./prisma/db.js";

export type AuditStatus = "SUCCESS" | "FAILURE" | "DENIED";

export type AuditSource =
  | "BUSINESS_API"
  | "MCP"
  | "AUTH"
  | "SYSTEM";

export interface CreateAuditLogInput {
  organizationId: number;
  userId?: number | null;
  action: string;
  source?: AuditSource;
  toolName?: string | null;
  status: AuditStatus;
  errorMessage?: string | null;
}

type AuditTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export async function createAuditLog(
  input: CreateAuditLogInput,
  tx?: AuditTransaction
) {
  const query = db.sql.public.auditLog
    .insert([
      {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        action: input.action,
        source: input.source ?? "SYSTEM",
        toolName: input.toolName ?? null,
        status: input.status,
        errorMessage: input.errorMessage ?? null,
      },
    ])
    .returning("id", "action", "status", "createdAt")
    .build();

  if (tx) {
    return tx.query(query);
  }

  const runtime = await getDbRuntime();
  return runtime.query(query);
}
