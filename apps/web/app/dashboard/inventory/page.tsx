
"use client";

import { useEffect, useState } from "react";
import InventoryMovementHistory from "./InventoryMovementHistory";
import StockMovementForm from "./stockMovementForm";
type Product = {
  id: number;
  name: string;
  sku: string;
  stockQuantity: number;
  minimumStock: number;
  salePrice: number;
};
function refreshInventory() {
  window.location.reload();
}
export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("/api/products");

        if (!response.ok) {
          throw new Error("Failed to fetch products.");
        }

        const data = await response.json();
        setProducts(data.products ?? []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) => total + product.stockQuantity,
    0
  );

  const lowStockProducts = products.filter(
    (product) =>
      product.stockQuantity <= product.minimumStock &&
      product.stockQuantity > 0
  );

  const outOfStockProducts = products.filter(
    (product) => product.stockQuantity === 0
  );

  if (loading) {
    return <div className="p-8">Loading inventory...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Inventory Management
        </h1>
        <p className="mt-2 text-gray-500">
          Monitor products and manage your stock.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={totalProducts}
        />

        <StatCard
          title="Total Stock Units"
          value={totalStock}
        />

        <StatCard
          title="Low Stock"
          value={lowStockProducts.length}
        />

        <StatCard
          title="Out of Stock"
          value={outOfStockProducts.length}
        />
      </div>

      <section className="mt-8 rounded-xl border bg-white p-6">
        <h2 className="mb-5 text-xl font-semibold">
          Inventory Products
        </h2>

        {products.length === 0 ? (
          <p className="text-gray-500">
            No products found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Sale Price</th>
                  <th className="p-3">Available Stock</th>
                  <th className="p-3">Minimum Stock</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const isOutOfStock =
                    product.stockQuantity === 0;

                  const isLowStock =
                    product.stockQuantity <= product.minimumStock;

                  return (
                    <tr
                      key={product.id}
                      className="border-b last:border-0"
                    >
                      <td className="p-3 font-medium">
                        {product.name}
                      </td>

                      <td className="p-3">
                        {product.sku}
                      </td>

                      <td className="p-3">
                        PKR {product.salePrice.toLocaleString()}
                      </td>

                      <td className="p-3">
                        {product.stockQuantity}
                      </td>

                      <td className="p-3">
                        {product.minimumStock}
                      </td>

                      <td className="p-3">
                        {isOutOfStock ? (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">
                            Low Stock
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-8">
  <StockMovementForm
    products={products}
    onSuccess={refreshInventory}
  />
  <InventoryMovementHistory />
</div>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="mt-3 text-3xl font-bold text-gray-900">
        {value.toLocaleString()}
      </h2>
    </div>
  );
}
