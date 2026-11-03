
import { redirect } from "next/navigation";
import { requirePermission } from "@business-platform/auth/authorization";
import { AuditLogsTable } from "../audit-logs-table";

export default async function AuditLogsPage() {
  try {
    await requirePermission("audit:read");
  } catch (error) {
    
    if (error instanceof Error && error.message === "Not authenticated.") {
      redirect("/login");
    }

    if (error instanceof Error && error.message === "Forbidden.") {
      redirect("/dashboard");
    }

    throw error;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 md:px-8 md:py-10">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
          Security & Monitoring
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Audit Logs
        </h2>

        <p className="mt-2 max-w-2xl text-slate-600">
          Monitor activities, track system events, and review actions
          performed within your organization.
        </p>
      </div>

      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Activity History
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Review recent activity and security events.
          </p>
        </div>

        <AuditLogsTable />
      </section>
    </div>
  );
}
