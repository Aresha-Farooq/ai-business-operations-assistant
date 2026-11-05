
import { redirect } from "next/navigation";
import { requirePermission } from "@business-platform/auth/authorization";
import { CustomersTable } from "./customers-table.js";

export default async function CustomersPage() {
  try {
    await requirePermission("customers:read");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Not authenticated.") {
        redirect("/login");
      }

      if (error.message === "Forbidden.") {
        redirect("/dashboard");
      }
    }

    throw error;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 md:px-8 md:py-10">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
          Business Management
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Customers
        </h2>

        <p className="mt-2 max-w-2xl text-slate-600">
          Manage your customer records, contact information, and relationships.
        </p>
      </div>

      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Customer Directory
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            View, search, add, and manage your organization's customers.
          </p>
        </div>

        <CustomersTable />
      </section>
    </div>
  );
}
