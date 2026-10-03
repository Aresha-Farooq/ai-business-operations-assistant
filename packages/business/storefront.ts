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
      "minimumStock"
    )
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.organizationId, organization.id),
        fns.eq(fields.isActive, true)
      )
    )
    .build();

  const products = await runtime.query(productPlan);

  return {
    organization,
    products,
  };
}