import type { IncomingMessage, ServerResponse } from "node:http";
import mcpHandler from "../mcp.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Delegate directly to mcpHandler with sse force
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  url.searchParams.set("sse", "true");
  req.url = url.pathname + url.search;
  return mcpHandler(req, res);
}
