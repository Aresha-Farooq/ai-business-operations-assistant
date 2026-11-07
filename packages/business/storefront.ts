import { db, getDbRuntime } from "@business-platform/database";

export async function getStorefrontProducts(slug: string) {
  const runtime = await getDbRuntime();

  // Find the organization from the public storefront slug
  const organizationPlan = db.sql.public.organization
    .select("id", "name", "slug")
    .where((fields, fns) => fns.eq(fields.slug, slug))
    .build();

  const organizations = await runtime.query(organizationPlan);
  const organization = organizations[0];

  if (!organization) {
    throw new Error("Storefront not found.");
  }

  // Get only active products belonging to this organization
  const productPlan = db.sql.public.product
    .select(
  "id",
  "name",
  "description",
  "salePrice",
  "stockQuantity",
  "minimumStock",
  "category",
  "imageUrl"
)
   .where((fields, fns) =>
  fns.and(
    fns.eq(fields.organizationId, organization.id),
    fns.eq(fields.isActive, true),
    fns.eq(fields.isPublished, true),
    fns.raw`${fields.deletedAt} IS NULL`.returns("pg/bool@1")
  )
)
    .build();

  const products = await runtime.query(productPlan);

  return {
    organization,
    products,
  };
}


export async function getStorefrontProduct(
  slug: string,
  productId: string
) {
  const runtime = await getDbRuntime();

  // Find the organization using its public storefront slug
  const organizationPlan = db.sql.public.organization
    .select("id", "name", "slug")
    .where((fields, fns) => fns.eq(fields.slug, slug))
    .build();

  const organizations = await runtime.query(organizationPlan);
  const organization = organizations[0];

  if (!organization) {
    throw new Error("Storefront not found.");
  }

  // Find the product within this organization
  const productPlan = db.sql.public.product
    .select(
      "id",
      "name",
      "description",
      "salePrice",
      "stockQuantity",
      "minimumStock",
      "category",
      "imageUrl"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, productId),
        fns.eq(fields.organizationId, organization.id),
        fns.eq(fields.isActive, true),
        fns.eq(fields.isPublished, true),
        fns.raw`${fields.deletedAt} IS NULL`.returns("pg/bool@1")
      )
    )
    .build();

  const products = await runtime.query(productPlan);
  const product = products[0];

  if (!product) {
    throw new Error("Product not found.");
  }

  return {
    organization,
    product,
  };
}