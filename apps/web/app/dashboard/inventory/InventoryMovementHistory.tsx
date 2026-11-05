
"use client";

import { useEffect, useState } from "react";

type InventoryMovement = {
  id: number;
  productId: number;
  organizationId: number;
  createdBy: number;
  quantity: number;
  type:
    | "PURCHASE"
    | "SALE"
    | "ADJUSTMENT"
    | "RETURN"
    | "DAMAGE";
  reason: string | null;
  createdAt: string;
};

export default function InventoryMovementHistory() {
  const [movements, setMovements] = useState<
    InventoryMovement[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMovements() {
      try {
        const response = await fetch(
          "/api/inventory/movements"
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to fetch movements."
          );
        }

        setMovements(data.movements ?? []);
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

    fetchMovements();
  }, []);

  function getMovementStatus(type: string) {
    switch (type) {
      case "PURCHASE":
        return "bg-green-100 text-green-700";

      case "SALE":
        return "bg-blue-100 text-blue-700";

      case "RETURN":
        return "bg-purple-100 text-purple-700";

      case "DAMAGE":
        return "bg-red-100 text-red-700";

      case "ADJUSTMENT":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  return (
    <section className="mt-8 rounded-xl border bg-white p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          Inventory Movement History
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Track all stock changes in your organization.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500">
          Loading movement history...
        </p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : movements.length === 0 ? (
        <p className="text-gray-500">
          No inventory movements recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3">Movement ID</th>
                <th className="p-3">Product ID</th>
                <th className="p-3">Movement Type</th>
                <th className="p-3">Quantity Change</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Performed By</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>

            <tbody>
              {movements.map((movement) => (
                <tr
                  key={movement.id}
                  className="border-b last:border-0"
                >
                  <td className="p-3">
                    #{movement.id}
                  </td>

                  <td className="p-3">
                    #{movement.productId}
                  </td>

                  <td className="p-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getMovementStatus(
                        movement.type
                      )}`}
                    >
                      {movement.type}
                    </span>
                  </td>

                  <td
                    className={`p-3 font-semibold ${
                      movement.quantity < 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {movement.quantity > 0 ? "+" : ""}
                    {movement.quantity}
                  </td>

                  <td className="p-3">
                    {movement.reason || "—"}
                  </td>

                  <td className="p-3">
                    User #{movement.createdBy}
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    {new Date(
                      movement.createdAt
                    ).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
