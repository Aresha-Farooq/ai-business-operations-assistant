export default function DashboardLoading() {
  return (
    <div className="px-5 py-10 md:px-8">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-8 w-72 animate-pulse rounded bg-slate-200" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-36 animate-pulse rounded-2xl bg-white" />
        <div className="h-36 animate-pulse rounded-2xl bg-white" />
        <div className="h-36 animate-pulse rounded-2xl bg-white" />
      </div>
      <p className="sr-only">Loading dashboard</p>
    </div>
  );
}
