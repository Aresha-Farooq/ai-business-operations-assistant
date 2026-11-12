import { db, getDbRuntime } from "@business-platform/database";
import { requirePermission } from "@business-platform/auth/authorization";

export async function getInventoryMovements() {
  const user = await requirePermission("inventory:read");

  const runtime = await getDbRuntime();

  const movementsPlan = db.sql.public.inventoryMovement
    .select(
      "id",
      "productId",
      "organizationId",
      "quantity",
      "type",
      "reason",
      "createdAt"
    )
    .where((fields, fns) =>
      fns.eq(fields.organizationId, user.organizationId)
    )
    .build();

  const movements = await runtime.query(movementsPlan);

  if (movements.length === 0) {
    return [];
  }

  const productIds = [
    ...new Set(movements.map((movement) => movement.productId)),
  ];

  const productsPlan = db.sql.public.product
    .select("id", "name", "sku")
    .where((fields, fns) => fns.in(fields.id, productIds))
    .build();

  const products = await runtime.query(productsPlan);

  return movements.map((movement) => ({
    ...movement,
    product:
      products.find((product) => product.id === movement.productId) ?? null,
  }));
}