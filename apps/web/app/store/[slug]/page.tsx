
import Link from "next/link";
import { notFound } from "next/navigation";

import { getStorefrontProducts } from "@business-platform/business/storefront";

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch the storefront and handle an invalid organization slug
  const result = await getStorefrontProducts(slug).catch(() => null);

  if (!result) {
    notFound();
  } 

  const { organization, products } = result;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {organization.name}
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              Official Online Store
            </p>
          </div>

          <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#home" className="transition hover:text-gray-900">
              Home
            </a>

            <a href="#products" className="transition hover:text-gray-900">
              Products
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section
        id="home"
        className="bg-slate-900 px-6 py-20 text-white"
      >
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Welcome to our store
          </p>

          <h2 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            Discover products you'll love.
          </h2>

          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            Explore our collection and find the products you're looking for.
          </p>

          <a
            href="#products"
            className="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
          >
            Explore Products
          </a>
        </div>
      </section>

      {/* Products Section */}
      <section
        id="products"
        className="mx-auto max-w-7xl px-6 py-16"
      >
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Our Collection
          </p>

          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            Available Products
          </h2>

          <p className="mt-2 text-gray-500">
            Explore the products available at {organization.name}.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <h3 className="text-xl font-semibold text-gray-800">
              No products available yet
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Please check back later for new products.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/store/${slug}/products/${product.id}`}
                className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                {/* Product Image */}
                <div className="flex h-64 items-center justify-center overflow-hidden bg-gray-100">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-sm text-gray-400">
                      No image available
                    </span>
                  )}
                </div>

                {/* Product Information */}
                <div className="p-5">
                  {product.category && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {product.category}
                    </p>
                  )}

                  <h3 className="mt-2 text-lg font-semibold text-gray-900">
                    {product.name}
                  </h3>

                  {product.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <p className="text-xl font-bold text-gray-900">
                      Rs. {Number(product.salePrice).toLocaleString("en-PK")}
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-600 group-hover:text-slate-900">
                      View Product →
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center">
          <p className="font-semibold text-gray-800">
            {organization.name}
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Thank you for visiting our store.
          </p>

          <p className="mt-4 text-xs text-gray-400">
            © {new Date().getFullYear()} {organization.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
