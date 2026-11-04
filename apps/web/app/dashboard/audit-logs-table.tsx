
"use client";

import { useEffect, useState } from "react";

type AuditStatus = "SUCCESS" | "FAILURE" | "DENIED";

type AuditSource = "BUSINESS_API" | "MCP" | "AUTH" | "SYSTEM";

type AuditLog = {
  id: number;
  organizationId: number;
  userId: number | null;
  action: string;
  source: AuditSource;
  toolName: string | null;
  status: AuditStatus;
  errorMessage: string | null;
  createdAt: string;
};

type AuditLogsResponse = {
  logs: AuditLog[];
  pagination: {
    page: number;
    pageSize: number;
  };
};

const auditTools = [
  { value: "get_low_stock_products", label: "Low Stock Products" },
  { value: "get_customer", label: "View Customer" },
  { value: "search_customers", label: "Search Customers" },
  { value: "get_order", label: "View Order" },
  { value: "get_inventory", label: "View Inventory" },
  { value: "get_sales_report", label: "Sales Report" },
  { value: "get_overdue_invoices", label: "Overdue Invoices" },
  { value: "get_invoice", label: "View Invoice" },
];

const auditSources: { value: AuditSource; label: string }[] = [
  { value: "BUSINESS_API", label: "Business API" },
  { value: "MCP", label: "MCP" },
  { value: "AUTH", label: "Authentication" },
  { value: "SYSTEM", label: "System" },
];

function getSourceLabel(source: AuditSource) {
  return auditSources.find((item) => item.value === source)?.label ?? source;
}

export function AuditLogsTable() {
  const [data, setData] = useState<AuditLogsResponse | null>(null);

  // Filter states
  const [status, setStatus] = useState<AuditStatus | "ALL">("ALL");
  const [source, setSource] = useState<AuditSource | "ALL">("ALL");
  const [toolName, setToolName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Request states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

 useEffect(() => {
  let cancelled = false;
  let isFetching = false;

  async function fetchAuditLogs(showLoading = false) {
    // Prevent overlapping requests
    if (isFetching) return;

    isFetching = true;

    try {
      // Show loading only for the initial request
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const params = new URLSearchParams();

      if (status !== "ALL") {
        params.set("status", status);
      }

      if (source !== "ALL") {
        params.set("source", source);
      }

      if (toolName.trim()) {
        params.set("toolName", toolName.trim());
      }

      if (startDate) {
        params.set("startDate", startDate);
      }

      if (endDate) {
        params.set("endDate", endDate);
      }

      const response = await fetch(
        `/api/audit-logs?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to load audit logs.");
      }

      const result: AuditLogsResponse = await response.json();

      if (!cancelled) {
        setData(result);
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      }
    } finally {
      isFetching = false;

      if (!cancelled && showLoading) {
        setLoading(false);
      }
    }
  }

  // Initial fetch
  fetchAuditLogs(true);

  // Refresh data every 5 seconds without hiding the table
  const interval = setInterval(() => {
    fetchAuditLogs();
  }, 5000);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}, [status, source, toolName, startDate, endDate]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        {/* Status Filter */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="audit-status"
            className="text-sm font-medium text-slate-700"
          >
            Status
          </label>

          <select
            id="audit-status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AuditStatus | "ALL")
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="ALL">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
            <option value="DENIED">Denied</option>
          </select>
        </div>

        {/* Source Filter */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="audit-source"
            className="text-sm font-medium text-slate-700"
          >
            Source
          </label>

          <select
            id="audit-source"
            value={source}
            onChange={(event) =>
              setSource(event.target.value as AuditSource | "ALL")
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="ALL">All Sources</option>

            {auditSources.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* Activity Type Filter */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="audit-tool"
            className="text-sm font-medium text-slate-700"
          >
            Activity Type
          </label>

          <select
            id="audit-tool"
            value={toolName}
            onChange={(event) => setToolName(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">All Activities</option>

            {auditTools.map((tool) => (
              <option key={tool.value} value={tool.value}>
                {tool.label}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="audit-start-date"
            className="text-sm font-medium text-slate-700"
          >
            From Date
          </label>

          <input
            id="audit-start-date"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="audit-end-date"
            className="text-sm font-medium text-slate-700"
          >
            To Date
          </label>

          <input
            id="audit-end-date"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        {/* Clear Filters */}
        <button
          type="button"
          onClick={() => {
            setStatus("ALL");
            setSource("ALL");
            setToolName("");
            setStartDate("");
            setEndDate("");
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Clear Filters
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <p className="text-sm text-slate-500">
          Loading audit logs...
        </p>
      )}

      {/* Error State */}
      {!loading && error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* Empty State */}
      {!loading && !error && (!data || data.logs.length === 0) && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No audit logs found for the selected filters.
        </p>
      )}

      {/* Audit Logs Table */}
      {!loading && !error && data && data.logs.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Action</th>
                <th className="px-5 py-4 font-medium">Source</th>
                <th className="px-5 py-4 font-medium">Tool</th>
                <th className="px-5 py-4 font-medium">User ID</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data.logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-800">
                    {log.action}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {getSourceLabel(log.source)}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {auditTools.find((tool) => tool.value === log.toolName)
                      ?.label ?? log.toolName ?? "—"}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {log.userId ?? "—"}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {log.status}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
