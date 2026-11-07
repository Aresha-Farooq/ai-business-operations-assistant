import Link from "next/link";
import { notFound } from "next/navigation";
import { getStorefrontProduct } from "@business-platform/business/storefront";
export default async function StoreProductPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  const result = await getStorefrontProduct(slug, id).catch(() => null);

  if (!result) {
    notFound();
  }

  const { organization, product } = result;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href={`/store/${slug}`}
            className="text-xl font-bold text-gray-900"
          >
            {organization.name}
          </Link>

          <Link
            href={`/store/${slug}`}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Back to Store
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-gray-400">
              No product image
            </span>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {product.category || "Product"}
          </p>

          <h1 className="text-4xl font-bold text-gray-900">
            {product.name}
          </h1>

          <p className="mt-5 text-3xl font-bold text-gray-900">
            Rs. {product.salePrice}
          </p>

          <p className="mt-6 whitespace-pre-line leading-7 text-gray-600">
            {product.description || "No description available."}
          </p>

          <div className="mt-6">
            {product.stockQuantity > 0 ? (
              <span className="font-medium text-green-700">
                In Stock
              </span>
            ) : (
              <span className="font-medium text-red-600">
                Out of Stock
              </span>
            )}
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Shopping cart functionality will be available soon.
          </p>
        </div>
      </section>
    </main>
  );
}
