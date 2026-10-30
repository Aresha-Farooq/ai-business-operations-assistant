import { createMcpHandler } from "@modelcontextprotocol/server";
import { getCurrentUser } from "@business-platform/auth/session";
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
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated.");
      return getLowStockProducts();
    },
    async (customerId) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated.");
      return getCustomer(customerId);
    },
    async (searchTerm) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated.");
      return searchCustomers(searchTerm);
    },
    async (orderId) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated.");
      return getOrderById(orderId);
    },
    async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated.");
      return getInventoryMovements();
    },
    async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated.");
      return getSalesReport();
    },
    async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated.");
      return getOverdueInvoices();
    },
    async (invoiceId) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated.");
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
