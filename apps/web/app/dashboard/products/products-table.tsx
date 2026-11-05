
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Product = {
  id: number;
  name: string;
  description: string | null;
  sku: string;
  purchasePrice: number;
  salePrice: number;
  stockQuantity: number;
  minimumStock: number;
  createdAt: string;
};

type ProductForm = {
  name: string;
  description: string;
  sku: string;
  purchasePrice: string;
  salePrice: string;
  stockQuantity: string;
  minimumStock: string;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  sku: "",
  purchasePrice: "",
  salePrice: "",
  stockQuantity: "0",
  minimumStock: "0",
};

export function ProductsTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function fetchProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/products");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch products.");
      }

      setProducts(result.products ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return products;

    return products.filter((product) =>
      [product.name, product.sku, product.description ?? ""]
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [products, search]);

  const lowStockCount = products.filter(
    (product) => product.stockQuantity <= product.minimumStock
  ).length;

  function openAddModal() {
    setEditingProduct(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      sku: product.sku,
      purchasePrice: String(product.purchasePrice),
      salePrice: String(product.salePrice),
      stockQuantity: String(product.stockQuantity),
      minimumStock: String(product.minimumStock),
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const purchasePrice = Number(form.purchasePrice);
    const salePrice = Number(form.salePrice);
    const stockQuantity = Number(form.stockQuantity);
    const minimumStock = Number(form.minimumStock);

    if (
      !Number.isFinite(purchasePrice) ||
      !Number.isFinite(salePrice) ||
      !Number.isInteger(stockQuantity) ||
      !Number.isInteger(minimumStock) ||
      purchasePrice < 0 ||
      salePrice < 0 ||
      stockQuantity < 0 ||
      minimumStock < 0
    ) {
      setError("Please enter valid non-negative prices and whole stock quantities.");
      return;
    }

    if (salePrice < purchasePrice) {
      setError("Sale price cannot be lower than purchase price.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const isEditing = editingProduct !== null;

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        sku: form.sku.trim(),
        purchasePrice,
        salePrice,
        minimumStock,
        ...(isEditing ? {} : { stockQuantity }),
      };

      const response = await fetch(
        isEditing
          ? `/api/products/${editingProduct.id}`
          : "/api/products",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        const validationErrors = result.details
          ? Array.isArray(result.details)
            ? result.details.map((item: { message?: string }) => item.message).filter(Boolean).join(" ")
            : Object.values(result.details).flat().join(" ")
          : "";

        throw new Error(
          validationErrors || result.error || "Failed to save product."
        );
      }

      setModalOpen(false);
      setEditingProduct(null);
      setForm(emptyForm);

      await fetchProducts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${product.name}?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(product.id);
      setError("");

      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete product.");
      }

      await fetchProducts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete product."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Products</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {products.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Low Stock Products</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {lowStockCount}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm text-slate-500">Product Directory</p>
            <p className="mt-2 font-semibold text-slate-900">
              Manage your products
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Product Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">All Products</h3>
            <p className="mt-1 text-sm text-slate-500">
              {filteredProducts.length} product(s) found
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 sm:max-w-xs"
          />
        </div>

        {error && !modalOpen && (
          <div
            role="alert"
            className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading products...
          </div>
        ) : error && products.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Unable to load products. Please try again.
            <button
              type="button"
              onClick={() => void fetchProducts()}
              className="ml-2 font-medium text-slate-900 underline"
            >
              Retry
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-slate-800">
              {search ? "No matching products found." : "No products yet."}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try a different search term."
                : "Add your first product to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Product</th>
                  <th className="px-5 py-4 font-semibold">SKU</th>
                  <th className="px-5 py-4 font-semibold">Purchase Price</th>
                  <th className="px-5 py-4 font-semibold">Sale Price</th>
                  <th className="px-5 py-4 font-semibold">Stock</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const lowStock =
                    product.stockQuantity <= product.minimumStock;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {product.name}
                        </p>
                        {product.description && (
                          <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {product.description}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {product.sku}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {Number(product.purchasePrice).toFixed(2)}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-900">
                        {Number(product.salePrice).toFixed(2)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {product.stockQuantity}
                        <span className="ml-1 text-xs text-slate-400">
                          / min {product.minimumStock}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            lowStock
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {lowStock ? "Low Stock" : "In Stock"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            className="rounded-md px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-200"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(product)}
                            disabled={deletingId === product.id}
                            className="rounded-md px-3 py-1.5 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === product.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
          <div className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingProduct ? "Edit Product" : "Add Product"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your product details.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setError("");
                }}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Product Name
                </label>
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Enter product name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  SKU
                </label>
                <input
                  required
                  value={form.sku}
                  onChange={(event) =>
                    setForm({ ...form, sku: event.target.value })
                  }
                  placeholder="Enter product SKU"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Enter product description"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Purchase Price
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchasePrice}
                    onChange={(event) =>
                      setForm({ ...form, purchasePrice: event.target.value })
                    }
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Sale Price
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.salePrice}
                    onChange={(event) =>
                      setForm({ ...form, salePrice: event.target.value })
                    }
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              {!editingProduct && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Initial Stock Quantity
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.stockQuantity}
                    onChange={(event) =>
                      setForm({ ...form, stockQuantity: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Minimum Stock Level
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.minimumStock}
                  onChange={(event) =>
                    setForm({ ...form, minimumStock: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <p className="text-xs text-slate-500">
                Sale price must be equal to or greater than purchase price.
                Stock changes after creation are managed through Inventory.
              </p>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setError("");
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                      ? "Save Changes"
                      : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
