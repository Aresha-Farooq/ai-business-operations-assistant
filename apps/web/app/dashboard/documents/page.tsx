"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type DocumentItem = {
  id: number;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt?: string;
};

type ApiResponse = {
  documents?: DocumentItem[];
  document?: DocumentItem;
  message?: string;
  error?: string;
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  APPROVED: "bg-green-50 text-green-700 ring-green-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
  UPLOADED: "bg-slate-100 text-slate-700 ring-slate-200",
  PROCESSING: "bg-blue-50 text-blue-700 ring-blue-200",
  PROCESSED: "bg-green-50 text-green-700 ring-green-200",
  FAILED: "bg-red-50 text-red-700 ring-red-200",
};

function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        statusStyles[value] ?? statusStyles.UPLOADED
      }`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/documents", {
        cache: "no-store",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load documents.");
      }

      setDocuments(data.documents ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load documents."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setError("Please select a document to upload.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Document upload failed.");
      }

      setMessage(data.message ?? "Document uploaded successfully.");
      form.reset();
      await loadDocuments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Document upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  async function reviewDocument(
    documentId: number,
    approvalStatus: "APPROVED" | "REJECTED"
  ) {
    setActionId(documentId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/documents/${documentId}/approval`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvalStatus }),
        }
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Document review failed.");
      }

      setMessage(
        data.message ??
          (approvalStatus === "APPROVED"
            ? "Document approved."
            : "Document rejected.")
      );

      await loadDocuments();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Document review failed."
      );
    } finally {
      setActionId(null);
    }
  }

  const pendingCount = documents.filter(
    (doc) => doc.approvalStatus === "PENDING"
  ).length;

  const processedCount = documents.filter(
    (doc) => doc.status === "PROCESSED"
  ).length;

  const failedCount = documents.filter(
    (doc) => doc.status === "FAILED"
  ).length;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-8 md:px-8 md:py-10">
      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
          Knowledge Management
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Documents
        </h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Upload company knowledge, review documents, and manage the sources
          available to your AI assistant.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {message}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total documents", value: documents.length },
          { label: "Awaiting approval", value: pendingCount },
          { label: "Processed", value: processedCount },
          { label: "Processing failed", value: failedCount },
        ].map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {loading ? "—" : stat.value}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">
          Upload a document
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          New documents require owner approval before processing.
        </p>

        <form
          onSubmit={handleUpload}
          className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="document-file"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Choose a file
            </label>
            <input
              id="document-file"
              name="file"
              type="file"
              required
              accept=".pdf,.docx,.txt,.md,.csv,.xlsx"
              disabled={uploading}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-medium file:text-slate-700"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Upload document"}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Your documents
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Review approval and processing status for each document.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDocuments()}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">
            Loading documents...
          </p>
        ) : documents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <h4 className="font-semibold text-slate-800">
              No documents yet
            </h4>
            <p className="mt-2 text-sm text-slate-500">
              Upload your first company document to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Document</th>
                  <th className="px-4 py-4 font-semibold">Size</th>
                  <th className="px-4 py-4 font-semibold">Uploaded</th>
                  <th className="px-4 py-4 font-semibold">Approval</th>
                  <th className="px-4 py-4 font-semibold">Processing</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <p className="max-w-xs truncate font-medium text-slate-900">
                        {doc.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {doc.mimeType}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {formatSize(doc.sizeBytes)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge value={doc.approvalStatus} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge value={doc.status} />
                    </td>
                    <td className="px-6 py-4">
                      {doc.approvalStatus === "PENDING" &&
                      doc.status === "UPLOADED" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={actionId === doc.id}
                            onClick={() =>
                              void reviewDocument(doc.id, "APPROVED")
                            }
                            className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                          >
                            {actionId === doc.id ? "Working..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={actionId === doc.id}
                            onClick={() =>
                              void reviewDocument(doc.id, "REJECTED")
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <p className="text-right text-xs text-slate-400">
                          No actions
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
