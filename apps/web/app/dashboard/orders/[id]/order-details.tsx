"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "CANCELLED"
  | "COMPLETED";

type ShippingStatus =
  | "NOT_SHIPPED"
  | "SHIPPED"
  | "DELIVERED";

type OrderDetailsData = {
  id: number;
  status: OrderStatus;
  shippingStatus: ShippingStatus;
  shippingName: string | null;
  shippingEmail: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  deliveryInstructions: string | null;
  totalAmount: number;
  createdAt: string;
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    product: {
      id: number;
      name: string;
      sku: string;
    } | null;
  }>;
  payments: Array<{
    id: number;
    amount: number;
    currency: string;
    method: string;
    status: string;
    createdAt: string;
  }>;
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatAmount(amount: number, currency = "PKR") {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

const buttonClass =
  "rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export function OrderDetails({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/orders/${orderId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load order.");
      }

      setOrder(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  async function updateStatus(
    type: "order" | "shipping",
    nextStatus: OrderStatus | ShippingStatus,
    successMessage: string
  ) {
    if (saving) return;

    if (
      nextStatus === "CANCELLED" &&
      !window.confirm(
        "Are you sure you want to cancel this order? Its stock will be restored."
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const endpoint =
        type === "order"
          ? `/api/orders/${orderId}/status`
          : `/api/orders/${orderId}/shipping`;

      const body =
        type === "order"
          ? { status: nextStatus }
          : { shippingStatus: nextStatus };

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update order.");
      }

      await fetchOrder();
      setSuccess(successMessage);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-sm text-slate-500">
        Loading order details...
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/orders"
          className="text-sm font-medium text-slate-700 underline"
        >
          ← Back to orders
        </Link>

        <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>

        <button
          type="button"
          onClick={() => void fetchOrder()}
          className={`${buttonClass} bg-slate-900 text-white`}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!order) return null;

  const reference = `ORD-${String(order.id).padStart(6, "0")}`;

  const canCancel =
    order.shippingStatus === "NOT_SHIPPED" &&
    ["PENDING", "CONFIRMED", "PROCESSING"].includes(order.status);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/orders"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Back to orders
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {reference}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            {formatStatus(order.status)}
          </span>
        </div>
      </div>

      {/* Order management controls */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">
          Order Management
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Update the order and delivery progress using the available actions.
        </p>

        {error && (
          <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {order.status === "PENDING" && (
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                void updateStatus("order", "CONFIRMED", "Order confirmed successfully.")
              }
              className={`${buttonClass} bg-green-700 text-white hover:bg-green-800`}
            >
              {saving ? "Updating..." : "Confirm Order"}
            </button>
          )}

          {order.status === "CONFIRMED" && (
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                void updateStatus("order", "PROCESSING", "Order moved to processing.")
              }
              className={`${buttonClass} bg-blue-700 text-white hover:bg-blue-800`}
            >
              {saving ? "Updating..." : "Start Processing"}
            </button>
          )}

          {order.status === "PROCESSING" &&
            order.shippingStatus === "DELIVERED" && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void updateStatus("order", "COMPLETED", "Order completed successfully.")
                }
                className={`${buttonClass} bg-green-700 text-white hover:bg-green-800`}
              >
                {saving ? "Updating..." : "Complete Order"}
              </button>
            )}

          {order.status === "PROCESSING" &&
            order.shippingStatus === "NOT_SHIPPED" && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void updateStatus("shipping", "SHIPPED", "Order marked as shipped.")
                }
                className={`${buttonClass} bg-blue-700 text-white hover:bg-blue-800`}
              >
                {saving ? "Updating..." : "Mark as Shipped"}
              </button>
            )}

          {order.status === "PROCESSING" &&
            order.shippingStatus === "SHIPPED" && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void updateStatus("shipping", "DELIVERED", "Order marked as delivered.")
                }
                className={`${buttonClass} bg-green-700 text-white hover:bg-green-800`}
              >
                {saving ? "Updating..." : "Mark as Delivered"}
              </button>
            )}

          {canCancel && (
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                void updateStatus("order", "CANCELLED", "Order cancelled. Inventory has been restored.")
              }
              className={`${buttonClass} border border-red-200 bg-white text-red-700 hover:bg-red-50`}
            >
              {saving ? "Updating..." : "Cancel Order"}
            </button>
          )}

          {["CANCELLED", "COMPLETED"].includes(order.status) && (
            <p className="self-center text-sm text-slate-500">
              This order has reached its final status.
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">
              Order Status
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatStatus(order.status)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-slate-400">
              Shipping Status
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatStatus(order.shippingStatus)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Customer */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Customer Information
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <p><span className="text-slate-500">Name: </span>{order.customer?.name ?? "—"}</p>
            <p><span className="text-slate-500">Email: </span>{order.customer?.email ?? "—"}</p>
            <p><span className="text-slate-500">Phone: </span>{order.customer?.phone ?? "—"}</p>
          </div>
        </section>

        {/* Delivery */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Delivery Information
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <p><span className="text-slate-500">Recipient: </span>{order.shippingName ?? "—"}</p>
            <p><span className="text-slate-500">Email: </span>{order.shippingEmail ?? "—"}</p>
            <p><span className="text-slate-500">Phone: </span>{order.shippingPhone ?? "—"}</p>
            <p><span className="text-slate-500">Address: </span>{order.shippingAddress ?? "—"}</p>
            <p><span className="text-slate-500">City: </span>{order.shippingCity ?? "—"}</p>
            <p><span className="text-slate-500">Instructions: </span>{order.deliveryInstructions ?? "—"}</p>
          </div>
        </section>
      </div>

      {/* Items */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900">Order Items</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[550px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">SKU</th>
                <th className="px-5 py-4">Quantity</th>
                <th className="px-5 py-4">Unit Price</th>
                <th className="px-5 py-4">Subtotal</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {item.product?.name ?? `Product #${item.productId}`}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {item.product?.sku ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{item.quantity}</td>
                  <td className="px-5 py-4 text-slate-600">
                    {formatAmount(item.unitPrice)}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {formatAmount(item.unitPrice * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-slate-200 p-5">
          <div className="text-right">
            <p className="text-sm text-slate-500">Order Total</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatAmount(order.totalAmount)}
            </p>
          </div>
        </div>
      </section>

      {/* Shipping and Payments */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Shipping Status</h2>
          <p className="mt-3 text-sm text-slate-600">
            {formatStatus(order.shippingStatus)}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Payments</h2>

          {order.payments.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No payment records found.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {order.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border-b border-slate-100 pb-3 text-sm last:border-0"
                >
                  <p className="font-medium text-slate-900">
                    {formatAmount(payment.amount, payment.currency)}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {formatStatus(payment.method)} · {formatStatus(payment.status)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(payment.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
