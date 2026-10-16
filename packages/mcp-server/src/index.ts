import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SpatialTwinMcpServer } from "./server.js";

async function main() {
  const bridgeUrl = process.env.SPATIALTWIN_BRIDGE_URL || "http://localhost:8000";
  const wrapper = new SpatialTwinMcpServer(bridgeUrl);
  const mcpServer = wrapper.getMcpServer();

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error(`[SpatialTwin MCP] Server running on stdio, bridge URL: ${bridgeUrl}`);
}

main().catch((err) => {
  console.error("[SpatialTwin MCP] Fatal error:", err);
  process.exit(1);
});
