"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Order = {
  id: number;
  customerId: number;
  organizationId: number;
  status: string;
  shippingStatus: string;
  shippingCity: string | null;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  items: Array<{
    id: number;
    orderId: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    product: {
      id: number;
      name: string;
      sku: string;
    } | null;
  }>;
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function fetchOrders() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/orders");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch orders.");
      }

      setOrders(result.orders ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchOrders();
  }, []);

  const availableStatuses = useMemo(
    () => [...new Set(orders.map((order) => order.status))].sort(),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        [
          String(order.id),
          `ORD-${String(order.id).padStart(6, "0")}`,
          order.customer?.name ?? "",
          order.customer?.email ?? "",
          order.shippingCity ?? "",
        ].some((value) => value.toLowerCase().includes(term));

      const matchesStatus =
        statusFilter === "ALL" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Orders</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {orders.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Order Value</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatAmount(
              orders.reduce((total, order) => total + order.totalAmount, 0)
            )}
          </p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">All Orders</h3>
            <p className="mt-1 text-sm text-slate-500">
              {filteredOrders.length} order(s) found
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search orders..."
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 sm:max-w-xs"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="ALL">All statuses</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading orders...
          </div>
        ) : error && orders.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Unable to load orders. Please try again.
            <button
              type="button"
              onClick={() => void fetchOrders()}
              className="ml-2 font-medium text-slate-900 underline"
            >
              Retry
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-slate-800">
              {search || statusFilter !== "ALL"
                ? "No matching orders found."
                : "No orders yet."}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Orders will appear here when customers place them.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Order</th>
                  <th className="px-5 py-4 font-semibold">Customer</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Items</th>
                  <th className="px-5 py-4 font-semibold">Total</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Shipping</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium">
  <Link
    href={`/dashboard/orders/${order.id}`}
    className="text-slate-900 underline decoration-slate-300 underline-offset-4 hover:text-slate-600"
  >
    ORD-{String(order.id).padStart(6, "0")}
  </Link>
</td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">
                        {order.customer?.name ?? "Unknown customer"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {order.customer?.email ?? "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {order.items.reduce(
                        (total, item) => total + item.quantity,
                        0
                      )}
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-900">
                      {formatAmount(order.totalAmount)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {formatStatus(order.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {formatStatus(order.shippingStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}