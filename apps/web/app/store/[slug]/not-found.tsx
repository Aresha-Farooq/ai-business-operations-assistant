import Link from "next/link";
export default function StoreNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Storefront
        </p>
        <h1 className="mt-5 text-7xl font-bold text-slate-900">
          404
        </h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-900">
          Page Not Found
        </h2>
        <p className="mt-3 leading-7 text-gray-500">
          Sorry, the store or product you're looking for doesn't exist
          or is no longer available.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Back to Homepage
        </Link>
      </div>
    </main>
  );
}
