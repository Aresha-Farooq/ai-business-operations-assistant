
import { createMcpHandler } from "@modelcontextprotocol/server";
import { getCurrentUser } from "@business-platform/auth/session";
import { requirePermission } from "@business-platform/auth";

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

const handler = createMcpHandler(() =>
  createBusinessMcpServer(
    async () => {
      await requirePermission("inventory:read");
      return getLowStockProducts();
    },

    async (customerId) => {
      await requirePermission("customers:read");
      return getCustomer(customerId);
    },

    async (searchTerm) => {
      await requirePermission("customers:read");
      return searchCustomers(searchTerm);
    },

    async (orderId) => {
      await requirePermission("orders:read");
      return getOrderById(orderId);
    },

    async () => {
      await requirePermission("inventory:read");
      return getInventoryMovements();
    },

    async () => {
      await requirePermission("sales:read");
      return getSalesReport();
    },

    async () => {
      await requirePermission("invoices:read");
      return getOverdueInvoices();
    },

    async (invoiceId) => {
      await requirePermission("invoices:read");
      return getInvoice(invoiceId);
    }
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
