
import { redirect } from "next/navigation";
import { requirePermission } from "@business-platform/auth/authorization";
import { OrderDetails } from "./order-details";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requirePermission("orders:read");
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated.") {
      redirect("/login");
    }

    if (error instanceof Error && error.message === "Forbidden.") {
      redirect("/dashboard");
    }

    throw error;
  }

  const { id } = await params;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 md:px-8 md:py-10">
      <OrderDetails orderId={id} />
    </div>
  );
}
