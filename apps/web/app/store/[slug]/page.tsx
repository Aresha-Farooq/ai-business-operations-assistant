import { getStorefrontProducts } from "@business-platform/business/storefront";

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { organization, products } =
    await getStorefrontProducts(slug);

  return (
    <main>
      <h1>{organization.name}</h1>

      <section>
        {products.map((product) => (
          <div key={product.id}>
            <h2>{product.name}</h2>

            <p>{product.description}</p>

            <p>Rs. {product.salePrice}</p>

            <button>Add to Cart</button>
          </div>
        ))}
      </section>
    </main>
  );
}