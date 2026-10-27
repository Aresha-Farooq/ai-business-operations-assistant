
import { createMcpHandler } from "@modelcontextprotocol/server";
import { getCurrentUser } from "@business-platform/auth/session";
import { getLowStockProducts } from "@business-platform/business";
import { createBusinessMcpServer } from "@business-platform/mcp";

export const runtime = "nodejs";

const handler = createMcpHandler(() =>
  createBusinessMcpServer(async () => {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated.");
    }

    return getLowStockProducts();
  })
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
