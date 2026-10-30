import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type {
  CustomerDetails,
  LowStockProduct,
} from "@business-platform/business";

type InvoiceDetails = {
  id: number;
  invoiceNumber: string;
  organizationId: number;
  orderId: number;
  amount: number;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type CustomerSearchResult = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  organizationId: number;
  isActive: boolean;
};

type SalesReport = {
  organizationId: number;
  totalOrders: number;
  totalSales: number;
  orders: Array<{
    id: number;
    status: string;
    totalAmount: number;
    createdAt: Date;
    organizationId: number;
  }>;
};

type OrderDetails = {
  id: number;
  customerId: number;
  organizationId: number;
  status: string;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  items: Array<{
    id: number;
    orderId: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    product: { id: number; name: string; sku: string } | null;
  }>;
};

type InventoryMovement = {
  id: number;
  productId: number;
  organizationId: number;
  quantity: number;
  type: string;
  reason: string | null;
  createdAt: Date;
  product: { id: number; name: string; sku: string } | null;
};

type OverdueInvoicesReport = {
  organizationId: number;
  totalOverdueInvoices: number;
  totalOverdueAmount: number;
  invoices: Array<{
    id: number;
    invoiceNumber: string;
    organizationId: number;
    orderId: number;
    amount: number;
    currency: string;
    issueDate: Date;
    dueDate: Date;
    status: string;
  }>;
};

export function createBusinessMcpServer(
  getLowStockProducts: () => Promise<LowStockProduct[]>,
  getCustomer: (customerId: number) => Promise<CustomerDetails | null>,
  searchCustomers: (searchTerm: string) => Promise<CustomerSearchResult[]>,
  getOrderById: (orderId: number) => Promise<OrderDetails>,
  getInventoryMovements: () => Promise<InventoryMovement[]>,
  getSalesReport: () => Promise<SalesReport>,
  getOverdueInvoices: () => Promise<OverdueInvoicesReport>,
  getInvoice: (invoiceId: number) => Promise<InvoiceDetails | null>
) {
  const server = new McpServer({
    name: "business-platform",
    version: "0.1.0",
  });

  server.registerTool(
    "get_low_stock_products",
    {
      title: "Get low-stock products",
      description:
        "Returns products for the authenticated organization whose stock is at or below their minimum stock level.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const products = await getLowStockProducts();
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(products) },
          ],
        };
      } catch (error) {
        console.error("MCP get_low_stock_products failed:", error);
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Unable to retrieve low-stock products.",
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "get_customer",
    {
      title: "Get customer",
      description:
        "Retrieves an active customer belonging to the authenticated organization by customer ID.",
      inputSchema: {
        customerId: z.number().int().positive().safe(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ customerId }) => {
      try {
        const customer = await getCustomer(customerId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                customer ?? { message: "Customer not found." }
              ),
            },
          ],
        };
      } catch (error) {
        console.error("MCP get_customer failed:", error);
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Unable to retrieve customer.",
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "search_customers",
    {
      title: "Search customers",
      description:
        "Searches active customers by name or email within the authenticated organization.",
      inputSchema: {
        searchTerm: z.string().trim().min(2).max(100),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ searchTerm }) => {
      try {
        const customers = await searchCustomers(searchTerm);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(customers) },
          ],
        };
      } catch (error) {
        console.error("MCP search_customers failed:", error);
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Unable to search customers.",
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "get_order",
    {
      title: "Get order",
      description:
        "Retrieves an order and its customer and line-item details within the authenticated organization.",
      inputSchema: {
        orderId: z.number().int().positive().safe(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ orderId }) => {
      try {
        const order = await getOrderById(orderId);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(order) },
          ],
        };
      } catch (error) {
        console.error("MCP get_order failed:", error);
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Unable to retrieve order.",
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "get_inventory",
    {
      title: "Get inventory movements",
      description:
        "Returns inventory movement records and associated product details for the authenticated organization.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const movements = await getInventoryMovements();
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(movements) },
          ],
        };
      } catch (error) {
        console.error("MCP get_inventory failed:", error);
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Unable to retrieve inventory movements.",
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "get_sales_report",
    {
      title: "Get sales report",
      description:
        "Returns sales totals and qualifying order details for the authenticated organization.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const report = await getSalesReport();
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(report) },
          ],
        };
      } catch (error) {
        console.error("MCP get_sales_report failed:", error);
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Unable to retrieve the sales report.",
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "get_overdue_invoices",
    {
      title: "Get overdue invoices",
      description:
        "Returns issued invoices past their due date for the authenticated organization, including the total overdue amount.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const report = await getOverdueInvoices();
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(report) },
          ],
        };
      } catch (error) {
        console.error("MCP get_overdue_invoices failed:", error);
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Unable to retrieve overdue invoices.",
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "get_invoice",
    {
      title: "Get invoice",
      description:
        "Retrieves an invoice by ID belonging to the authenticated organization.",
      inputSchema: {
        invoiceId: z.number().int().positive().safe(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ invoiceId }) => {
      try {
        const invoice = await getInvoice(invoiceId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                invoice ?? { message: "Invoice not found." }
              ),
            },
          ],
        };
      } catch (error) {
        console.error("MCP get_invoice failed:", error);
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Unable to retrieve invoice.",
            },
          ],
        };
      }
    }
  );

  return server;
}
