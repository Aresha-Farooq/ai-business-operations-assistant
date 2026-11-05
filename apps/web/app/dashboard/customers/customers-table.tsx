
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

type CustomerForm = {
  name: string;
  email: string;
  phone: string;
};

const emptyForm: CustomerForm = {
  name: "",
  email: "",
  phone: "",
};

export function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function fetchCustomers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/customers");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch customers.");
      }

      setCustomers(result.customers ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return customers;

    return customers.filter((customer) =>
      [customer.name, customer.email, customer.phone ?? ""]
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [customers, search]);

  function openAddModal() {
    setEditingCustomer(null);
    setForm(emptyForm);
    setModalOpen(true);
    setError("");
  }

  function openEditModal(customer: Customer) {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone ?? "",
    });
    setModalOpen(true);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const isEditing = editingCustomer !== null;
      const url = isEditing
        ? `/api/customers/${editingCustomer.id}`
        : "/api/customers";

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const validationErrors = result.details
          ? Object.values(result.details).flat().join(" ")
          : "";

        throw new Error(
          validationErrors || result.error || "Failed to save customer."
        );
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingCustomer(null);

      await fetchCustomers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save customer."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customer: Customer) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${customer.name}?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(customer.id);
      setError("");

      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete customer.");
      }

      await fetchCustomers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete customer."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary and Add Button */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Customers</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {customers.length}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm text-slate-500">Customer Directory</p>
            <p className="mt-2 font-semibold text-slate-900">
              Manage your customers
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            + Add Customer
          </button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">
              All Customers
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {filteredCustomers.length} customer(s) found
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customers..."
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
            Loading customers...
          </div>
        ) : error && customers.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Unable to load customers. Please try again.
            <button
              type="button"
              onClick={() => void fetchCustomers()}
              className="ml-2 font-medium text-slate-900 underline"
            >
              Retry
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-slate-800">
              {search ? "No matching customers found." : "No customers yet."}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try a different search term."
                : "Add your first customer to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Customer</th>
                  <th className="px-5 py-4 font-semibold">Email</th>
                  <th className="px-5 py-4 font-semibold">Phone</th>
                  <th className="px-5 py-4 font-semibold">Joined</th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {customer.name}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {customer.email}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {customer.phone || "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(customer)}
                          className="rounded-md px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(customer)}
                          disabled={deletingId === customer.id}
                          className="rounded-md px-3 py-1.5 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === customer.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingCustomer ? "Edit Customer" : "Add Customer"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the customer's contact information.
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
                  Full Name
                </label>
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Enter customer name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="customer@example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Phone Number
                  <span className="ml-1 text-slate-400">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  placeholder="Enter phone number"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

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
                    : editingCustomer
                      ? "Save Changes"
                      : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
