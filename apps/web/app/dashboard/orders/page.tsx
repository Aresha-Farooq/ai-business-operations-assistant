import { redirect } from "next/navigation";
import { requirePermission } from "@business-platform/auth/authorization";
import { OrdersTable } from "./orders-table";

export default async function OrdersPage() {
  try {
    await requirePermission("orders:read");
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
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="mt-2 text-sm text-slate-500">
          View and manage orders placed by your customers.
        </p>
      </div>

      <OrdersTable />
    </div>
  );
}