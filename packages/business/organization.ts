import { db, getDbRuntime } from "@business-platform/database";

export async function getOrganizationBySlug(slug: string) {
  const runtime = await getDbRuntime();

  const organizationPlan = db.sql.public.organization
    .select("id", "name", "slug")
    .where((fields, fns) =>
      fns.eq(fields.slug, slug)
    )
    .build();

  const organizations = await runtime.query(organizationPlan);

  const organization = organizations[0];

  if (!organization) {
    throw new Error("Storefront not found.");
  }

  return organization;
}