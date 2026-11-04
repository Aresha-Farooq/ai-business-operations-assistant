
import { createMcpHandler } from "@modelcontextprotocol/server";
import { getCurrentUser } from "@business-platform/auth/session";
import { requirePermission } from "@business-platform/auth";
import { createAuditLog } from "@business-platform/database";

import {
  getCustomer,
  getLowStockProducts,
  searchCustomers,
  getOrderById,
  getInventoryMovements,
  getSalesReport,
  getOverdueInvoices,
  getInvoice,
} from "@business-platform/business";

import { createBusinessMcpServer } from "@business-platform/mcp";

export const runtime = "nodejs";

type Permission =
  | "customers:read"
  | "orders:read"
  | "inventory:read"
  | "sales:read"
  | "invoices:read";

async function audit(
  user: { userId: number; organizationId: number },
  toolName: string,
  status: "SUCCESS" | "FAILURE" | "DENIED",
  errorMessage?: string
) {
  try {
    await createAuditLog({
      organizationId: user.organizationId,
      userId: user.userId,
      action: `MCP_${toolName}`,
      source: "MCP",
      toolName,
      status,
      errorMessage,
    });
  } catch (error) {
    // Audit failure must not break the MCP operation.
    console.error("Audit logging failed:", error);
  }
}

async function executeTool<T>(
  toolName: string,
  permission: Permission,
  operation: () => Promise<T>
): Promise<T> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  try {
    await requirePermission(permission);
  } catch (error) {
    await audit(user, toolName, "DENIED", "Permission denied.");
    throw error;
  }

  try {
    const result = await operation();
    await audit(user, toolName, "SUCCESS");
    return result;
  } catch (error) {
    await audit(user, toolName, "FAILURE", "Tool execution failed.");
    throw error;
  }
}

const handler = createMcpHandler(() =>
  createBusinessMcpServer(
    () =>
      executeTool("get_low_stock_products", "inventory:read", () =>
        getLowStockProducts()
      ),

    (customerId) =>
      executeTool("get_customer", "customers:read", () =>
        getCustomer(customerId)
      ),

    (searchTerm) =>
      executeTool("search_customers", "customers:read", () =>
        searchCustomers(searchTerm)
      ),

    (orderId) =>
      executeTool("get_order", "orders:read", () =>
        getOrderById(orderId)
      ),

    () =>
      executeTool("get_inventory", "inventory:read", () =>
        getInventoryMovements()
      ),

    () =>
      executeTool("get_sales_report", "sales:read", () =>
        getSalesReport()
      ),

    () =>
      executeTool("get_overdue_invoices", "invoices:read", () =>
        getOverdueInvoices()
      ),

    (invoiceId) =>
      executeTool("get_invoice", "invoices:read", () =>
        getInvoice(invoiceId)
      )
  )
);

async function handleRequest(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  return handler.fetch(request);
}

export const POST = handleRequest;
