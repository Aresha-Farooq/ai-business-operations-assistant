
import { McpServer } from "@modelcontextprotocol/server";
import type { LowStockProduct } from "@business-platform/business";
export function createBusinessMcpServer(
getLowStockProducts: () => Promise<LowStockProduct[]>
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
            {
              type: "text" as const,
              text: JSON.stringify(products),
            },
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

  return server;
}
