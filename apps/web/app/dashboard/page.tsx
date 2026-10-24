import Link from "next/link";
import { getCurrentWorkspace } from "@/lib/current-workspace";
import { DASHBOARD_SUGGESTIONS } from "@/lib/assistant-questions";
import {
  AssistantIcon,
  DocumentsIcon,
  InventoryIcon,
} from "@/components/dashboard/icons";

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 md:px-8 md:py-10">
      {workspace.dataError ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {workspace.dataError}
        </p>
      ) : null}

      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
          {workspace.organizationName}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Welcome{workspace.userName ? `, ${workspace.userName}` : ""}
        </h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Ask questions about company knowledge and keep business operations in
          one workspace. Document counts and operational statistics are not
          shown here until those pages are connected.
        </p>
        <Link
          href="/dashboard/assistant"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <AssistantIcon className="h-5 w-5" />
          Open AI Assistant
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">AI Assistant</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <AssistantIcon className="h-5 w-5" />
            </span>
          </div>
          <h3 className="mt-5 text-lg font-semibold text-slate-900">
            Ask company questions
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Uses your organization&apos;s processed documents through the
            existing assistant API.
          </p>
          <Link
            href="/dashboard/assistant"
            className="mt-4 inline-block text-sm font-medium text-slate-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Go to assistant
          </Link>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Documents</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <DocumentsIcon className="h-5 w-5" />
            </span>
          </div>
          <h3 className="mt-5 text-lg font-semibold text-slate-900">
            Knowledge sources
          </h3>
          <p className="mt-1 text-sm text-slate-500">
  Upload company documents, review approval requests, and manage
  knowledge sources for your AI assistant.
</p>

<Link
  href="/dashboard/documents"
  className="mt-4 inline-block text-sm font-medium text-slate-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
>
  Manage documents
</Link>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Business Operations
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <InventoryIcon className="h-5 w-5" />
            </span>
          </div>
          <h3 className="mt-5 text-lg font-semibold text-slate-900">
            Customers, inventory, and orders
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Operational dashboards are not connected to this UI yet.
          </p>
          <p className="mt-4 text-sm text-slate-400">Coming soon</p>
        </article>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="text-lg font-semibold text-slate-900">
            Suggested questions
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            These open the assistant and send the question to your organization
            knowledge base.
          </p>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {DASHBOARD_SUGGESTIONS.map((suggestion) => (
            <Link
              key={suggestion.title}
              href={`/dashboard/assistant?q=${encodeURIComponent(suggestion.question)}`}
              className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            >
              <h4 className="font-semibold text-slate-800">{suggestion.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {suggestion.question}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
