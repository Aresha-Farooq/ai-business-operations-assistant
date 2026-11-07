
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Staff = {
  id: number;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  isActive: boolean;
  createdAt?: string;
};

type StaffFormData = {
  name: string;
  email: string;
  password: string;
  role: "MANAGER" | "STAFF";
};

const initialForm: StaffFormData = {
  name: "",
  email: "",
  password: "",
  role: "STAFF",
};

export function StaffTable() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState<StaffFormData>(initialForm);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/staff");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load staff.");
      }

      setStaff(data.staff);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStaff();
  }, [fetchStaff]);

  function openAddForm() {
    setEditingStaff(null);
    setForm(initialForm);
    setError("");
    setShowForm(true);
  }

  function openEditForm(member: Staff) {
    setEditingStaff(member);
    setForm({
      name: member.name,
      email: member.email,
      password: "",
      role: member.role === "MANAGER" ? "MANAGER" : "STAFF",
    });
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingStaff(null);
    setForm(initialForm);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const isEditing = editingStaff !== null;

      const url = isEditing
        ? `/api/staff/${editingStaff.id}`
        : "/api/staff";

      const method = isEditing ? "PATCH" : "POST";

      const body = isEditing
        ? {
            name: form.name,
            email: form.email,
            role: form.role,
          }
        : form;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to save staff member."
        );
      }

      closeForm();
      await fetchStaff();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(member: Staff) {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${member.name}?`
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await fetch(`/api/staff/${member.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to deactivate staff member."
        );
      }

      await fetchStaff();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    }
  }

  const filteredStaff = staff.filter((member) => {
    const query = search.toLowerCase();

    return (
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">

      {/* Header actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <input
            type="search"
            placeholder="Search staff by name, email, or role..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          + Add Staff
        </button>
      </div>

      {/* Error message */}
      {error && !showForm && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingStaff ? "Edit Staff Member" : "Add New Staff"}
            </h3>

            <button
              type="button"
              onClick={closeForm}
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="staff-name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Full Name
                </label>

                <input
                  id="staff-name"
                  type="text"
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Enter full name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label
                  htmlFor="staff-email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email Address
                </label>

                <input
                  id="staff-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="employee@example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              {!editingStaff && (
                <div>
                  <label
                    htmlFor="staff-password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Initial Password
                  </label>

                  <input
                    id="staff-password"
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="staff-role"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Staff Role
                </label>

                <select
                  id="staff-role"
                  value={form.role}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      role: event.target.value as "MANAGER" | "STAFF",
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingStaff
                    ? "Save Changes"
                    : "Create Staff"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Staff table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Loading staff members...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <h3 className="font-semibold text-slate-900">
              {search ? "No matching staff found" : "No staff members yet"}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {search
                ? "Try searching with a different name, email, or role."
                : "Add your first staff member to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Staff Member
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Role
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((member) => (
                  <tr
                    key={member.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">
                        {member.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {member.email}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {member.role}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-3">
                        {member.role !== "OWNER" && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditForm(member)}
                              className="text-sm font-medium text-sky-700 hover:text-sky-900"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeactivate(member)}
                              className="text-sm font-medium text-red-600 hover:text-red-800"
                            >
                              Deactivate
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-sm text-slate-500">
        Showing {filteredStaff.length} of {staff.length} active staff members.
      </p>
    </div>
  );
}
