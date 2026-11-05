
"use client";

import { useState } from "react";

type Product = {
  id: number;
  name: string;
  sku: string;
};

type Props = {
  products: Product[];
  onSuccess: () => void;
};

export default function StockMovementForm({
  products,
  onSuccess,
}: Props) {
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [type, setType] = useState("PURCHASE");
  const [adjustmentDirection, setAdjustmentDirection] =
    useState("INCREASE");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    const payload: Record<string, unknown> = {
      productId: Number(productId),
      quantity: Number(quantity),
      type,
      reason,
    };

    if (type === "ADJUSTMENT") {
      payload.adjustmentDirection = adjustmentDirection;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/inventory/movements",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update stock."
        );
      }

      setProductId("");
      setQuantity("");
      setType("PURCHASE");
      setAdjustmentDirection("INCREASE");
      setReason("");

      onSuccess();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border bg-white p-6"
    >
      <h2 className="text-xl font-semibold">
        Record Stock Movement
      </h2>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Select Product
        </label>

        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
          className="w-full rounded-lg border p-3"
        >
          <option value="">Choose a product</option>

          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.sku})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Movement Type
        </label>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-lg border p-3"
        >
          <option value="PURCHASE">Purchase</option>
          <option value="SALE">Sale</option>
          <option value="RETURN">Return</option>
          <option value="DAMAGE">Damage</option>
          <option value="ADJUSTMENT">Adjustment</option>
        </select>
      </div>

      {type === "ADJUSTMENT" && (
        <div>
          <label className="mb-2 block text-sm font-medium">
            Adjustment Direction
          </label>

          <select
            value={adjustmentDirection}
            onChange={(e) =>
              setAdjustmentDirection(e.target.value)
            }
            className="w-full rounded-lg border p-3"
          >
            <option value="INCREASE">Increase Stock</option>
            <option value="DECREASE">Decrease Stock</option>
          </select>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium">
          Quantity
        </label>

        <input
          type="number"
          min="1"
          step="1"
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Enter quantity"
          className="w-full rounded-lg border p-3"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Reason
        </label>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for stock movement"
          rows={3}
          className="w-full rounded-lg border p-3"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Record Movement"}
      </button>
    </form>
  );
}
