
import { db, getDbRuntime } from "@business-platform/database";
import { randomUUID } from "node:crypto";
// --------------------------------------------------
// Product tenant isolation fixture
// --------------------------------------------------

export async function createTenantIsolationFixture() {
  const runtime = await getDbRuntime();

  const organizationPlan = db.sql.public.organization
    .insert([
      {
        name: `Tenant Test Org ${Date.now()}`,
      },
    ])
    .returning(
      "id",
      "name",
      "createdAt",
      "updatedAt"
    )
    .build();

  const organizations = await runtime.query(organizationPlan);
  const organization = organizations[0];

  if (!organization) {
    throw new Error("Failed to create test organization.");
  }

  const productPlan = db.sql.public.product
    .insert([
      {
        name: "Tenant Isolation Test Product",
        description: "Temporary product for tenant isolation testing.",
        sku: `TENANT-TEST-${Date.now()}`,
        purchasePrice: 100,
        salePrice: 150,
        stockQuantity: 10,
        minimumStock: 1,
        organizationId: organization.id,
      },
    ])
    .returning(
      "id",
      "name",
      "sku",
      "organizationId"
    )
    .build();

  const products = await runtime.query(productPlan);
  const product = products[0];

  if (!product) {
    throw new Error("Failed to create test product.");
  }

  return {
    organization,
    product,
  };
}

export async function cleanupTenantIsolationFixture(
  organizationId: number,
  productId: number
) {
  const runtime = await getDbRuntime();

  const deleteProductPlan = db.sql.public.product
    .delete()
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, productId),
        fns.eq(fields.organizationId, organizationId)
      )
    )
    .build();

  await runtime.query(deleteProductPlan);

  const deleteOrganizationPlan = db.sql.public.organization
    .delete()
    .where((fields, fns) =>
      fns.eq(fields.id, organizationId)
    )
    .build();

  await runtime.query(deleteOrganizationPlan);
}

// --------------------------------------------------
// Staff tenant isolation fixture
// --------------------------------------------------

export async function createStaffTenantFixture(
  role: "OWNER" | "MANAGER" | "STAFF" = "STAFF"
) {
  const runtime = await getDbRuntime();

  const organizationPlan = db.sql.public.organization
    .insert([
      {
        name: `Staff Test Org ${Date.now()}`,
      },
    ])
    .returning("id", "name")
    .build();

  const organizations = await runtime.query(organizationPlan);
  const organization = organizations[0];

  if (!organization) {
    throw new Error("Failed to create staff test organization.");
  }

  const userPlan = db.sql.public.user
    .insert([
      {
        name: "Tenant B Staff",
      email: `tenant-b-${randomUUID()}@example.com`,
        passwordHash: "test-hash",
        organizationId: organization.id,
        role: role,
        isActive: true,
        deletedAt: null,
      },
    ])
    .returning(
      "id",
      "name",
      "email",
      "organizationId",
      "role",
      "isActive"
    )
    .build();

  const users = await runtime.query(userPlan);
  const user = users[0];

  if (!user) {
    throw new Error("Failed to create staff test user.");
  }

  return {
    organization,
    user,
  };
}

export async function cleanupStaffTenantFixture(
  organizationId: number,
  userId: number
) {
  const runtime = await getDbRuntime();

  const deleteUserPlan = db.sql.public.user
    .delete()
    .where((fields, fns) =>
      fns.and(
        fns.eq(fields.id, userId),
        fns.eq(fields.organizationId, organizationId)
      )
    )
    .build();

  await runtime.query(deleteUserPlan);

  const deleteOrganizationPlan = db.sql.public.organization
    .delete()
    .where((fields, fns) =>
      fns.eq(fields.id, organizationId)
    )
    .build();

  await runtime.query(deleteOrganizationPlan);
}
