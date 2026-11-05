
import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/current-workspace";
import { ProductsTable } from "./products-table";

export default async function ProductsPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 md:px-8 md:py-10">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
          Business Management
        </p>

        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Products
        </h2>

        <p className="mt-2 max-w-2xl text-slate-600">
          Manage your product catalog, pricing, and available stock.
        </p>
      </div>

      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Product Directory
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Add, update, search, and manage your organization's products.
          </p>
        </div>

        <ProductsTable />
      </section>
    </div>
  );
}
